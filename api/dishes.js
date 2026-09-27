// POST /api/dishes  ->  streams 3 dish suggestions, one JSON object per line
//                      (2 ideas when mode is "gap": the Today tab's "Close my gap").
// GET  /api/dishes  ->  health check (shows which AI provider is active).
//
// Switch AI model with environment variables only, no code change:
//   AI_PROVIDER=gemini     (default, free tier)  needs GEMINI_API_KEY,   optional GEMINI_MODEL
//   AI_PROVIDER=anthropic  (Claude)              needs ANTHROPIC_API_KEY, optional ANTHROPIC_MODEL
//   AI_PROVIDER=mock       (fake dishes, costs nothing; for local testing)

import { buildPrompt, dishCount, validatePayload } from "../lib/prompt.js";

const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";
const DEFAULT_ANTHROPIC_MODEL = "claude-haiku-4-5";
const MID_STREAM_ERROR = "The AI is busy right now and stopped partway. Try again in a moment.";

// ---- Basic abuse protection -------------------------------------------------
// Best effort: each server instance remembers recent requests per IP.
const WINDOW_MS = 5 * 60 * 1000;
const MAX_PER_WINDOW = 15;
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > MAX_PER_WINDOW;
}

function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function provider() {
  return (process.env.AI_PROVIDER || "gemini").toLowerCase();
}

// Turns a provider's Server-Sent Events stream into plain text chunks.
function sseToText(body, extract) {
  const reader = body.getReader();
  const dec = new TextDecoder();
  const enc = new TextEncoder();
  let buf = "";
  let failed = false;
  const handle = (line, ctrl) => {
    if (failed || !line.startsWith("data:")) return false;
    const data = line.slice(5).trim();
    if (!data || data === "[DONE]") return false;
    try {
      const evt = JSON.parse(data);
      // Providers can fail mid-answer (e.g. Gemini free tier "high demand" 503) after sending a 200.
      // Tell the page on its own line so it can offer "Try again" instead of showing half a dish.
      if (evt.error || evt.type === "error") {
        failed = true;
        console.error("[dishes] mid-stream error", JSON.stringify(evt.error || evt).slice(0, 300));
        ctrl.enqueue(enc.encode("\n" + JSON.stringify({ error: MID_STREAM_ERROR }) + "\n"));
        return true;
      }
      const text = extract(evt);
      if (text) {
        ctrl.enqueue(enc.encode(text));
        return true;
      }
    } catch {
      /* ignore keep-alives and partial frames */
    }
    return false;
  };
  return new ReadableStream({
    // Keep reading until at least one piece of text is sent (or the stream ends);
    // returning from pull() without enqueuing would stall the reader.
    async pull(ctrl) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) {
          buf.split(/\r?\n/).forEach((l) => handle(l, ctrl));
          ctrl.close();
          return;
        }
        buf += dec.decode(value, { stream: true });
        const lines = buf.split(/\r?\n/);
        buf = lines.pop();
        let sent = false;
        for (const l of lines) sent = handle(l, ctrl) || sent;
        if (failed) {
          reader.cancel().catch(() => {});
          ctrl.close();
          return;
        }
        if (sent) return;
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });
}

class UpstreamError extends Error {
  constructor(status, detail) {
    super(`AI provider returned ${status}`);
    this.status = status;
    this.detail = detail;
  }
}

async function streamGemini(prompt, signal) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new UpstreamError(500, "GEMINI_API_KEY is not set");
  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.9, maxOutputTokens: 4096, thinkingConfig: { thinkingLevel: "low" } },
  };
  const call = () =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body),
      signal,
    });
  let res = await call();
  if (res.status === 400) {
    // Some models don't accept thinkingConfig; retry once without it.
    delete body.generationConfig.thinkingConfig;
    res = await call();
  }
  if (!res.ok) throw new UpstreamError(res.status, await res.text().catch(() => ""));
  return sseToText(res.body, (evt) =>
    (evt.candidates?.[0]?.content?.parts || [])
      .filter((p) => !p.thought)
      .map((p) => p.text || "")
      .join("")
  );
}

async function streamAnthropic(prompt, signal) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new UpstreamError(500, "ANTHROPIC_API_KEY is not set");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL,
      max_tokens: 2000,
      temperature: 0.9,
      stream: true,
      messages: [{ role: "user", content: prompt }],
    }),
    signal,
  });
  if (!res.ok) throw new UpstreamError(res.status, await res.text().catch(() => ""));
  return sseToText(res.body, (evt) =>
    evt.type === "content_block_delta" && evt.delta?.type === "text_delta" ? evt.delta.text : ""
  );
}

function streamMock(data) {
  const k = data.kitchen;
  const pick = (i) => k[i % k.length];
  const t = data.target;
  const names = data.mode === "gap" ? ["snack cup", "quick plate"] : ["masala bowl", "stir-fry", "wrap"];
  const dishes = names.slice(0, dishCount(data)).map((kind, i) => ({
    name: `${pick(i)} ${kind}`,
    tagline: "Mock dish for testing. Set AI_PROVIDER to gemini for real ones.",
    minutes: [20, 15, 25][i],
    protein: Math.round(t.protein * [1, 0.92, 1.08][i]),
    carbs: Math.round(t.carbs * [1.05, 0.9, 1][i]),
    fat: Math.round(t.fat * [0.95, 1.1, 0.9][i]),
    uses: [pick(i), pick(i + 1)],
    extra: i === 1 ? ["Coriander"] : [],
    steps: ["Prep the ingredients.", "Cook the base.", "Add the main ingredient.", "Season and serve."],
  }));
  const enc = new TextEncoder();
  let i = 0;
  return new ReadableStream({
    async pull(ctrl) {
      if (i >= dishes.length) return ctrl.close();
      await new Promise((r) => setTimeout(r, 250));
      ctrl.enqueue(enc.encode(JSON.stringify(dishes[i++]) + "\n"));
    },
  });
}

export async function GET() {
  return json(200, { ok: true, provider: provider() });
}

export async function POST(request) {
  const ip = (request.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  if (rateLimited(ip)) {
    return json(429, { error: "Lots of requests from you in a short time. Wait a few minutes, then try again." });
  }

  let raw;
  try {
    const text = await request.text();
    if (text.length > 20000) return json(413, { error: "That request is too large." });
    raw = JSON.parse(text);
  } catch {
    return json(400, { error: "Send your choices as JSON." });
  }
  const v = validatePayload(raw);
  if (!v.ok) return json(400, { error: v.error });

  try {
    const p = provider();
    let stream;
    if (p === "mock") stream = streamMock(v.data);
    else if (p === "anthropic") stream = await streamAnthropic(buildPrompt(v.data), request.signal);
    else stream = await streamGemini(buildPrompt(v.data), request.signal);
    return new Response(stream, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  } catch (err) {
    if (err?.name === "AbortError") return new Response(null, { status: 499 });
    console.error("[dishes]", err?.message, err?.detail ? String(err.detail).slice(0, 500) : "");
    if (err?.status === 429) {
      return json(429, { error: "The free AI limit is used up for now. Try again in a little while." });
    }
    return json(502, { error: "The dish service had a problem. Try again in a moment." });
  }
}

// POST /api/dishes  ->  streams 3 dish suggestions, one JSON object per line
//                      (2 ideas when mode is "gap": the Today tab's "Close my gap").
// GET  /api/dishes  ->  health check (shows the active provider and model chain).
//
// Switch AI model with environment variables only, no code change:
//   AI_PROVIDER=gemini     (default, free tier)  needs GEMINI_API_KEY,   optional GEMINI_MODELS
//   AI_PROVIDER=anthropic  (Claude)              needs ANTHROPIC_API_KEY, optional ANTHROPIC_MODEL
//   AI_PROVIDER=mock       (fake dishes, costs nothing; for local testing)
//
// Resilience: GEMINI_MODELS is a comma-separated fallback chain. If a model is busy or out of
// quota (429/500/503) before answering, the next model is tried straight away. If one stops
// partway, the next model is asked only for the dishes still missing, and the page keeps
// receiving dishes as if nothing happened. Each request logs which model(s) answered.

import { buildPrompt, dishCount, validatePayload } from "../lib/prompt.js";

const DEFAULT_GEMINI_MODELS = "gemini-3.5-flash-lite,gemini-3.8-flash,gemini-3.6-flash,gemini-3.1-flash-lite";
const DEFAULT_ANTHROPIC_MODEL = "claude-haiku-4-5";
const BUSY = "The AI is busy right now. Try again in a moment.";
const PARTIAL = "The AI is busy right now and stopped partway. Try again in a moment.";
const QUOTA = "The free AI limit is used up for now. Try again in a little while.";
// Worth trying the next model for these. 404 covers a model name that was retired or mistyped.
const TRY_NEXT = new Set([404, 429, 500, 503]);

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

function splitList(s) {
  return String(s || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

// The models to try, in order. GEMINI_MODEL (single, older setting) still works and goes first.
function modelChain() {
  const p = provider();
  if (p === "mock") return ["mock"];
  if (p === "anthropic") return [process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL];
  const list = process.env.GEMINI_MODELS
    ? splitList(process.env.GEMINI_MODELS)
    : [...splitList(process.env.GEMINI_MODEL), ...splitList(DEFAULT_GEMINI_MODELS)];
  return [...new Set(list)];
}

class UpstreamError extends Error {
  constructor(status, detail) {
    super(`AI provider returned ${status}`);
    this.status = status;
    this.detail = detail;
  }
}

// Yields the text inside a provider's Server-Sent Events stream. Throws UpstreamError if the
// provider reports an error partway (Gemini sends these after a 200 when it gets overloaded).
async function* sseText(body, extract) {
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      buf += done ? dec.decode() : dec.decode(value, { stream: true });
      const lines = buf.split(/\r?\n/);
      buf = done ? "" : lines.pop();
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        let evt;
        try {
          evt = JSON.parse(data);
        } catch {
          continue; // keep-alives and partial frames
        }
        if (evt.error || evt.type === "error") {
          const e = evt.error || evt;
          throw new UpstreamError(Number(e.code) || 503, JSON.stringify(e));
        }
        const text = extract(evt);
        if (text) yield text;
      }
      if (done) return;
    }
  } finally {
    reader.cancel().catch(() => {});
  }
}

async function openGemini(model, prompt, signal) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new UpstreamError(500, "GEMINI_API_KEY is not set");
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
  return sseText(res.body, (evt) =>
    (evt.candidates?.[0]?.content?.parts || [])
      .filter((p) => !p.thought)
      .map((p) => p.text || "")
      .join("")
  );
}

async function openAnthropic(model, prompt, signal) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new UpstreamError(500, "ANTHROPIC_API_KEY is not set");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: 2000, temperature: 0.9, stream: true, messages: [{ role: "user", content: prompt }] }),
    signal,
  });
  if (!res.ok) throw new UpstreamError(res.status, await res.text().catch(() => ""));
  return sseText(res.body, (evt) =>
    evt.type === "content_block_delta" && evt.delta?.type === "text_delta" ? evt.delta.text : ""
  );
}

async function* streamMock(data) {
  const k = data.kitchen;
  const pick = (i) => k[i % k.length];
  const t = data.target;
  const kinds = data.mode === "gap" ? ["snack cup", "quick plate", "power bowl"] : ["masala bowl", "stir-fry", "wrap", "tikka plate"];
  const seen = data.shown.map((s) => s.toLowerCase());
  const dishes = kinds
    .map((kind, i) => ({
      name: `${pick(i)} ${kind}`,
      tagline: "Mock dish for testing. Set AI_PROVIDER to gemini for real ones.",
      minutes: [20, 15, 25, 30][i],
      protein: Math.round(t.protein * [1, 0.92, 1.08, 0.97][i]),
      carbs: Math.round(t.carbs * [1.05, 0.9, 1, 1.02][i]),
      fat: Math.round(t.fat * [0.95, 1.1, 0.9, 1][i]),
      uses: [pick(i), pick(i + 1)],
      extra: i === 1 ? ["Coriander"] : [],
      steps: ["Prep the ingredients.", "Cook the base.", "Add the main ingredient.", "Season and serve."],
    }))
    .filter((d) => !seen.includes(d.name.toLowerCase()))
    .slice(0, dishCount(data));
  for (const d of dishes) {
    await new Promise((r) => setTimeout(r, 250));
    yield JSON.stringify(d) + "\n";
  }
}

function openModel(model, data, signal) {
  const p = provider();
  if (p === "mock") return streamMock(data);
  if (p === "anthropic") return openAnthropic(model, buildPrompt(data), signal);
  return openGemini(model, buildPrompt(data), signal);
}

// One dish per line; tolerate code fences and trailing commas. Returns the object or null.
function parseDish(line) {
  line = line.trim().replace(/^```(json)?/i, "").replace(/```$/, "").replace(/,$/, "").trim();
  if (!line.startsWith("{")) return null;
  try {
    const o = JSON.parse(line);
    return o && typeof o === "object" && typeof o.name === "string" && o.name.trim() ? o : null;
  } catch {
    return null;
  }
}
// Fallback when a model ignores the one-per-line format and sends an array or {"dishes":[...]}.
function parseWhole(text) {
  try {
    const s = text.indexOf("["), e = text.lastIndexOf("]");
    if (s !== -1 && e > s) {
      const arr = JSON.parse(text.slice(s, e + 1));
      if (Array.isArray(arr)) return arr.map((o) => parseDish(JSON.stringify(o))).filter(Boolean);
    }
    const s2 = text.indexOf("{"), e2 = text.lastIndexOf("}");
    if (s2 !== -1 && e2 > s2) {
      const obj = JSON.parse(text.slice(s2, e2 + 1));
      if (Array.isArray(obj?.dishes)) return obj.dishes.map((o) => parseDish(JSON.stringify(o))).filter(Boolean);
    }
  } catch {
    /* not JSON */
  }
  return [];
}

// Walks the model chain, yielding finished dishes (as JSON strings) until `want` have arrived.
// `run` records what happened for the log line and the final error message.
async function* dishesFromChain(data, signal, run) {
  const want = dishCount(data);
  for (const model of modelChain()) {
    const need = want - run.names.length;
    if (need <= 0) return;
    const attempt = { model, dishes: 0, status: "ok" };
    run.attempts.push(attempt);
    // Ask only for what's missing, and tell the model what the page already has.
    const ask = { ...data, count: need, shown: [...data.shown, ...run.names] };
    let buf = "";
    let all = "";
    const accept = (d) => {
      const key = d.name.trim().toLowerCase();
      if (run.names.some((n) => n.toLowerCase() === key)) return null;
      run.names.push(d.name.trim());
      attempt.dishes++;
      return JSON.stringify(d);
    };
    try {
      const chunks = await openModel(model, ask, signal);
      for await (const text of chunks) {
        all += text;
        buf += text;
        const lines = buf.split("\n");
        buf = lines.pop();
        for (const l of lines) {
          const d = parseDish(l);
          const out = d && accept(d);
          if (out) yield out;
          if (run.names.length >= want) return; // leaving the loop also cancels the upstream stream
        }
      }
      const tail = parseDish(buf);
      const extra = tail ? [tail] : attempt.dishes ? [] : parseWhole(all);
      for (const d of extra) {
        const out = accept(d);
        if (out) yield out;
        if (run.names.length >= want) return;
      }
      if (attempt.dishes < need) attempt.status = "short"; // answered but gave too few; next model fills in
    } catch (err) {
      if (signal?.aborted || err?.name === "AbortError") throw err;
      attempt.status = err?.status || "error";
      attempt.detail = String(err?.detail || err?.message || "").slice(0, 200);
      run.lastStatus = err?.status;
      if (err?.status && !TRY_NEXT.has(err.status) && !attempt.dishes) {
        run.fatal = true; // e.g. 401/403: a bad key won't work on the next model either
        return;
      }
    }
  }
}

function logRun(data, run, started) {
  const want = dishCount(data);
  const chain = run.attempts
    .map((a) => `${a.model}:${a.status}${a.dishes ? `(${a.dishes})` : ""}`)
    .join(" -> ");
  const answered = [...new Set(run.attempts.filter((a) => a.dishes).map((a) => a.model))].join("+") || "none";
  const line = `[dishes] mode=${data.mode} got=${run.names.length}/${want} answered_by=${answered} chain=${chain} ms=${Date.now() - started}`;
  if (run.names.length < want) {
    console.error(line, run.attempts.filter((a) => a.detail).map((a) => `${a.model}: ${a.detail}`).join(" | "));
  } else console.log(line);
}

export async function GET() {
  return json(200, { ok: true, provider: provider(), models: modelChain() });
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

  const data = v.data;
  const started = Date.now();
  const run = { names: [], attempts: [], lastStatus: null, fatal: false };
  const dishes = dishesFromChain(data, request.signal, run);

  // Wait for the first dish before replying, so if every model fails we can still send a
  // proper error status instead of an empty 200.
  let first;
  try {
    first = await dishes.next();
  } catch (err) {
    if (err?.name === "AbortError" || request.signal?.aborted) return new Response(null, { status: 499 });
    run.attempts.push({ model: "?", dishes: 0, status: "crash", detail: String(err?.message || err) });
    first = { done: true };
  }
  if (first.done) {
    logRun(data, run, started);
    const allQuota = run.attempts.length && run.attempts.every((a) => a.status === 429);
    if (allQuota) return json(429, { error: QUOTA });
    if (run.fatal) return json(502, { error: "The dish service had a problem. Try again in a moment." });
    return json(503, { error: BUSY });
  }

  const enc = new TextEncoder();
  let finished = false;
  const finish = () => {
    if (!finished) {
      finished = true;
      logRun(data, run, started);
    }
  };
  const stream = new ReadableStream({
    start(ctrl) {
      ctrl.enqueue(enc.encode(first.value + "\n"));
    },
    async pull(ctrl) {
      try {
        const r = await dishes.next();
        if (!r.done) return ctrl.enqueue(enc.encode(r.value + "\n"));
        // Every model was tried and some dishes are still missing: say so on its own line.
        if (run.names.length < dishCount(data)) ctrl.enqueue(enc.encode(JSON.stringify({ error: PARTIAL }) + "\n"));
      } catch (err) {
        if (!(err?.name === "AbortError" || request.signal?.aborted)) {
          ctrl.enqueue(enc.encode(JSON.stringify({ error: PARTIAL }) + "\n"));
        }
      }
      finish();
      ctrl.close();
    },
    cancel() {
      finish();
      dishes.return().catch(() => {});
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

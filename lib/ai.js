// Shared helper for the one-shot endpoints (photo scan, food log, recipe by name).
// /api/dishes streams and has its own chain logic; these ask once and want a JSON object back.
// Same provider switch as dishes.js: AI_PROVIDER=gemini (default) | anthropic | mock.

const DEFAULT_GEMINI_MODELS = "gemini-3.8-flash,gemini-3.5-flash-lite,gemini-3.6-flash,gemini-3.1-flash-lite";
const DEFAULT_ANTHROPIC_MODEL = "claude-haiku-4-5";
const TRY_NEXT = new Set([404, 429, 500, 503]);

export class AIError extends Error {
  constructor(status, detail) {
    super(`AI provider returned ${status}`);
    this.status = status;
    this.detail = detail;
  }
}

export function provider() {
  return (process.env.AI_PROVIDER || "gemini").toLowerCase();
}

function splitList(s) {
  return String(s || "").split(",").map((x) => x.trim()).filter(Boolean);
}

export function modelChain() {
  const p = provider();
  if (p === "mock") return ["mock"];
  if (p === "anthropic") return [process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL];
  const list = process.env.GEMINI_MODELS
    ? splitList(process.env.GEMINI_MODELS)
    : [...splitList(process.env.GEMINI_MODEL), ...splitList(DEFAULT_GEMINI_MODELS)];
  return [...new Set(list)];
}

export function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

// Best-effort per-IP limit; each server instance remembers recent requests.
export function makeLimiter(max, windowMs = 5 * 60 * 1000) {
  const hits = new Map();
  return (ip) => {
    const now = Date.now();
    const list = (hits.get(ip) || []).filter((t) => now - t < windowMs);
    list.push(now);
    hits.set(ip, list);
    if (hits.size > 5000) hits.clear();
    return list.length > max;
  };
}

export function clientIp(request) {
  const f = request.headers.get("x-forwarded-for") || "";
  return f.split(",")[0].trim() || "unknown";
}

export async function readJson(request, maxChars) {
  const text = await request.text();
  if (text.length > maxChars) throw Object.assign(new Error("too large"), { status: 413 });
  try {
    return JSON.parse(text);
  } catch {
    throw Object.assign(new Error("bad json"), { status: 400 });
  }
}

// "data:image/jpeg;base64,...." -> { mime, data }, or null. The page shrinks photos first, so
// anything big is refused rather than sent to the model.
const MAX_IMAGE_CHARS = 1_600_000;
export function parseImage(dataUrl) {
  if (typeof dataUrl !== "string") return null;
  const m = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!m || m[2].length > MAX_IMAGE_CHARS || m[2].length < 100) return null;
  return { mime: m[1], data: m[2] };
}

// Pulls the JSON object out of a model reply (tolerates code fences and stray words).
export function extractJson(text) {
  let t = String(text || "").trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  const a = t.indexOf("{");
  const b = t.lastIndexOf("}");
  if (a === -1 || b <= a) return null;
  t = t.slice(a, b + 1);
  try {
    return JSON.parse(t);
  } catch {
    try {
      return JSON.parse(t.replace(/,\s*([}\]])/g, "$1"));
    } catch {
      return null;
    }
  }
}

async function askGemini(model, prompt, image, maxTokens, signal) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new AIError(500, "GEMINI_API_KEY is not set");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const parts = [{ text: prompt }];
  if (image) parts.push({ inlineData: { mimeType: image.mime, data: image.data } });
  const body = {
    contents: [{ role: "user", parts }],
    generationConfig: { temperature: 0.4, maxOutputTokens: maxTokens, responseMimeType: "application/json", thinkingConfig: { thinkingLevel: "low" } },
  };
  const call = () =>
    fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key }, body: JSON.stringify(body), signal });
  let res = await call();
  if (res.status === 400) {
    delete body.generationConfig.thinkingConfig; // some models don't accept it
    res = await call();
  }
  if (!res.ok) throw new AIError(res.status, await res.text().catch(() => ""));
  const j = await res.json();
  const cand = j.candidates?.[0];
  const text = (cand?.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || "").join("");
  return { text, finish: cand?.finishReason };
}

async function askAnthropic(model, prompt, image, maxTokens, signal) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new AIError(500, "ANTHROPIC_API_KEY is not set");
  const content = [];
  if (image) content.push({ type: "image", source: { type: "base64", media_type: image.mime, data: image.data } });
  content.push({ type: "text", text: prompt + "\n\nReply with the JSON object only." });
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: maxTokens, temperature: 0.4, messages: [{ role: "user", content }] }),
    signal,
  });
  if (!res.ok) throw new AIError(res.status, await res.text().catch(() => ""));
  const j = await res.json();
  return { text: (j.content || []).map((c) => c.text || "").join(""), finish: j.stop_reason };
}

// Asks the model chain for one JSON object. Tries the next model on busy/quota/timeouts or an
// unreadable reply. `accept(obj)` may return false to reject a reply (e.g. missing fields).
// Resolves { data, model }; throws AIError(status) when every model failed.
export async function askJson({ prompt, image = null, maxTokens = 2048, signal, timeoutMs = 25000, totalMs = 50000, accept = () => true, log = "ai" }) {
  const tried = [];
  let lastStatus = 503;
  const started = Date.now();
  for (const model of modelChain()) {
    // Vercel stops a function at 60 s, so stop trying while there is still time to answer.
    const left = totalMs - (Date.now() - started);
    if (left < 5000) {
      tried.push(`${model}:skipped`);
      break;
    }
    const ctl = new AbortController();
    const onAbort = () => ctl.abort();
    signal?.addEventListener("abort", onAbort);
    const timer = setTimeout(() => ctl.abort(), Math.min(timeoutMs, left));
    try {
      const run = provider() === "anthropic" ? askAnthropic : askGemini;
      const { text, finish } = await run(model, prompt, image, maxTokens, ctl.signal);
      const data = extractJson(text);
      if (data && accept(data)) {
        console.log(`[${log}] ok model=${model}${finish && finish !== "STOP" ? ` finish=${finish}` : ""}`);
        return { data, model };
      }
      tried.push(`${model}:unreadable${finish ? `{${finish}}` : ""}`);
      lastStatus = 502;
    } catch (err) {
      if (signal?.aborted) throw Object.assign(new Error("aborted"), { name: "AbortError" });
      const status = err instanceof AIError ? err.status : 503; // our own timeout abort lands here
      tried.push(`${model}:${err instanceof AIError ? status : "timeout"}`);
      lastStatus = status;
      if (err instanceof AIError && !TRY_NEXT.has(status) && status !== 400) {
        console.warn(`[${log}] fatal ${tried.join(" ")} ${String(err.detail || "").slice(0, 160)}`);
        throw err; // e.g. 401/403: a bad key won't work on the next model either
      }
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }
  }
  console.warn(`[${log}] all models failed: ${tried.join(" ")}`);
  throw new AIError(lastStatus === 429 ? 429 : lastStatus === 502 ? 502 : 503, tried.join(" "));
}

export function errorResponse(err) {
  if (err?.status === 429) return json(429, { error: "The free AI limit is used up for now. Try again in a little while." });
  if (err?.status === 502) return json(502, { error: "The AI sent something we couldn’t read. Try again." });
  return json(503, { error: "The AI is busy right now. Try again in a moment." });
}

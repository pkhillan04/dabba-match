// POST /api/scan  { image: "data:image/jpeg;base64,..." }  ->  { items: [{ name, known, confidence }] }
// Photo of a fridge, shelf or grocery bag -> the ingredients the AI can see. Names that match the
// app's own ingredient list come back with that exact name (known: true) so they select straight
// away; anything else comes back as a plain name the person can add as a custom item.

import { AIError, askJson, clientIp, errorResponse, json, makeLimiter, parseImage, provider, readJson } from "../lib/ai.js";
import { TABLE, lookup } from "../lib/nutrition.js";

const limited = makeLimiter(12);
const KNOWN = TABLE.map((r) => r[0]);

function prompt() {
  return [
    "You look at a photo of food ingredients (a fridge, kitchen shelf, counter or grocery bag) for an Indian home cook, and list what is clearly visible.",
    "Rules: only list food or cooking ingredients you can really see. Do not guess what is inside closed boxes, jars or bags unless the label is readable. Do not list utensils, appliances or people. If the photo shows no food, return an empty list. At most 25 items.",
    `When an item matches one of these names, use that exact name: ${KNOWN.join(", ")}.`,
    'Otherwise use a short common name, Indian home names are fine (for example "Curry leaves", "Dahi" is "Curd (dahi)").',
    'confidence is "high" when it is clearly that item, "medium" when it probably is, "low" when unsure.',
    'Reply with one JSON object only: {"items":[{"name":"string","confidence":"high|medium|low"}]}',
  ].join("\n");
}

export async function POST(request) {
  if (limited(clientIp(request))) return json(429, { error: "Lots of requests right now. Wait a minute, then try again." });
  let raw;
  try {
    raw = await readJson(request, 2_000_000);
  } catch (e) {
    return json(e.status || 400, { error: e.status === 413 ? "That photo is too large." : "Send the photo as JSON." });
  }
  const image = parseImage(raw?.image);
  if (!image) return json(400, { error: "Send a JPEG, PNG or WebP photo (it is shrunk first, so it should be small)." });

  let list;
  if (provider() === "mock") {
    list = [{ name: "Eggs", confidence: "high" }, { name: "onions", confidence: "high" }, { name: "Paneer", confidence: "medium" }, { name: "Curry leaves", confidence: "low" }, { name: "Tomato", confidence: "high" }];
  } else {
    try {
      const { data } = await askJson({
        prompt: prompt(),
        image,
        maxTokens: 1200,
        signal: request.signal,
        log: "scan",
        accept: (o) => Array.isArray(o.items),
      });
      list = data.items;
    } catch (err) {
      if (err?.name === "AbortError") return new Response(null, { status: 499 });
      return errorResponse(err instanceof AIError ? err : new AIError(503, String(err?.message || err)));
    }
  }

  const seen = new Set();
  const items = [];
  for (const it of list) {
    const rawName = String(typeof it === "string" ? it : it?.name || "").replace(/\s+/g, " ").trim().slice(0, 40);
    if (!rawName) continue;
    // "onions" / "tomatoes" and friends: map to the app's own item when the name is recognised.
    const hit = lookup(rawName);
    const exact = KNOWN.find((k) => k.toLowerCase() === rawName.toLowerCase());
    const known = exact || (hit && hit.label !== "fixed" && KNOWN.includes(hit.label) ? hit.label : "");
    const name = known || rawName.replace(/\b\w/g, (c, i) => (i === 0 ? c.toUpperCase() : c));
    if (seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    const c = String(it?.confidence || "medium").toLowerCase();
    items.push({ name, known: !!known, confidence: ["high", "medium", "low"].includes(c) ? c : "medium" });
    if (items.length >= 25) break;
  }
  return json(200, { items });
}

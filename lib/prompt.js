// Builds the dish prompt on the server from structured choices sent by the page.
// Keeping the prompt here (not in the browser) means the endpoint can only ever be
// used to suggest dishes, never as a free general-purpose chatbot on your API key.

const DIETS = {
  nonveg: "Non-veg (eats everything)",
  egg: "Eggetarian (vegetarian plus eggs; no meat or fish)",
  veg: "Vegetarian (no meat, fish or eggs)",
  vegan: "Vegan (fully plant-based: no meat, fish, eggs, dairy or honey)",
};
const MOODS = {
  any: "",
  spicy: "spicy",
  comfort: "comfort food",
  street: "street-style",
  fresh: "fresh and light",
  sweet: "something sweet",
};
const TIMES = ["any", "15", "30", "45"];

function clamp(n, lo, hi) {
  n = Number(n);
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, Math.round(n)));
}

function strList(v, max, maxLen) {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x) => typeof x === "string")
    .map((s) => s.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLen))
    .filter(Boolean)
    .slice(0, max);
}

export function validatePayload(raw) {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Send your choices as JSON." };
  const t = raw.target || {};
  const data = {
    target: {
      kcal: clamp(t.kcal, 80, 3000),
      protein: clamp(t.protein, 0, 300),
      carbs: clamp(t.carbs, 0, 500),
      fat: clamp(t.fat, 0, 200),
    },
    kitchen: strList(raw.kitchen, 60, 40),
    diet: DIETS[raw.diet] ? raw.diet : "nonveg",
    avoid: strList(raw.avoid, 10, 30),
    time: TIMES.includes(String(raw.time)) ? String(raw.time) : "any",
    mood: MOODS[raw.mood] !== undefined ? raw.mood : "any",
    recent: strList(raw.recent, 10, 80),
    shown: strList(raw.shown, 6, 80),
  };
  if (!data.kitchen.length) return { ok: false, error: "Add at least one ingredient first." };
  return { ok: true, data };
}

export function buildPrompt(d) {
  const t = d.target;
  const lines = [
    "You suggest home-cooked dishes for someone who eats to macro targets (gym / fitness nutrition). They are bored of repeating meals and want variety from what they already have.",
    `INGREDIENTS ON HAND: ${d.kitchen.join(", ")}.`,
    'Always assume salt, cooking oil, water and common Indian spices (turmeric, chilli powder, cumin, garam masala) are available. Anything else not listed must go in "extra" and should be at most 2 small items.',
    `DIET: ${DIETS[d.diet]}.` + (d.avoid.length ? ` Never use: ${d.avoid.join(", ")}.` : ""),
    "CUISINE: Indian home-style is preferred, but global dishes are welcome if they suit the ingredients.",
    `TARGET FOR THIS ONE MEAL (per serving): about ${t.kcal} kcal, ${t.protein} g protein, ${t.carbs} g carbs, ${t.fat} g fat. Scale ingredient quantities in the steps so one serving lands near these numbers; protein matters most.`,
    d.time !== "any" ? `TIME: total cooking time must be ${d.time} minutes or less.` : "",
    d.mood !== "any" ? `MOOD: they are craving something ${MOODS[d.mood]}.` : "",
    d.recent.length ? `RECENTLY COOKED (do not repeat or closely copy): ${d.recent.join("; ")}.` : "",
    d.shown.length ? `ALREADY SHOWN (suggest clearly different dishes): ${d.shown.join("; ")}.` : "",
    "Give 3 clearly different dishes. Steps: 4 to 6 short imperative steps with gram or cup quantities for one serving.",
    "OUTPUT FORMAT: exactly 3 lines, each line one complete minified JSON object, nothing else before, between or after (no markdown, no code fences). Each object:",
    '{"name":"string, max 6 words","tagline":"string, max 12 words","minutes":number,"protein":number,"carbs":number,"fat":number,"uses":["ingredients from the on-hand list"],"extra":["items not on hand"],"steps":["..."]}',
  ];
  return lines.filter(Boolean).join("\n");
}

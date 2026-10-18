// POST /api/recipe  { dish, diet, avoid }  ->  { dish: {...} }
// "Just the recipe": the person already knows what they want to cook. One dish, one serving, in the
// same format as /api/dishes (ingredients, one-action steps, honest times), with the macros
// recalculated from the ingredient list. Not sized to any target.

import { AIError, askJson, clientIp, errorResponse, json, makeLimiter, provider, readJson } from "../lib/ai.js";
import { buildRecipePrompt, validateRecipe } from "../lib/prompt.js";
import { checkTimes, hasRecipe } from "../lib/dish.js";
import { recompute } from "../lib/nutrition.js";

const limited = makeLimiter(15);

// True when the reply is about what was typed: some word of 3+ letters matches (allowing a typo or
// two, so "biriyani" matches "Biryani"), or the typed text is a common dish word in another language.
function words(t) {
  return String(t).toLowerCase().normalize("NFKD").replace(/[^a-z\s]/g, " ").split(/\s+/).filter((w) => w.length >= 3);
}
function close(a, b) {
  if (a === b || (a.length >= 4 && (b.startsWith(a) || a.startsWith(b)))) return true;
  if (Math.abs(a.length - b.length) > 2 || Math.min(a.length, b.length) < 4) return false;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length] <= 2;
}
const SAME = { anda: "egg", eggs: "egg", aloo: "potato", gobhi: "cauliflower", gobi: "cauliflower", baingan: "brinjal", bhindi: "okra", palak: "spinach", murgh: "chicken", murg: "chicken", dahi: "curd", chawal: "rice", matar: "peas", gosht: "mutton", machli: "fish", macchi: "fish", kheema: "keema" };
function relatedName(asked, answer) {
  const a = words(asked), b = words(answer);
  if (!a.length) return true;
  const norm = (w) => SAME[w] || w;
  return a.some((x) => b.some((y) => close(x, y) || close(norm(x), norm(y))));
}

function mockDish(name) {
  const title = name.replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 40);
  return {
    name: title,
    tagline: "Mock recipe for testing. Set AI_PROVIDER to gemini for real ones.",
    prepMin: 10,
    cookMin: 20,
    soakHours: 0,
    protein: 30,
    carbs: 50,
    fat: 15,
    uses: [],
    extra: [],
    ingredients: [
      { name: "Oil", qty: 1, unit: "tsp" },
      { name: "Jeera", qty: 0.5, unit: "tsp" },
      { name: "Onion", qty: 1, unit: "pieces" },
      { name: "Tomato", qty: 1, unit: "pieces" },
      { name: "Paneer", qty: 0.5, unit: "block", g: 100 },
      { name: "Rice", qty: 0.5, unit: "katori", g: 60 },
      { name: "Haldi", qty: 0.25, unit: "tsp" },
      { name: "Salt", qty: 0, unit: "to taste" },
    ],
    steps: [
      "Heat {1} in a kadai.",
      "Add {2} and let it crackle.",
      "Add chopped {3}. Fry until golden.",
      "Add chopped {4} and {7}.",
      "Cook until the masala turns thick.",
      "Add {5} and {8}. Simmer 5 minutes.",
      "Serve hot with {6}.",
    ],
  };
}

export async function POST(request) {
  if (limited(clientIp(request))) return json(429, { error: "Lots of requests right now. Wait a minute, then try again." });
  let raw;
  try {
    raw = await readJson(request, 4000);
  } catch (e) {
    return json(e.status || 400, { error: e.status === 413 ? "That request is too large." : "Send the dish name as JSON." });
  }
  const v = validateRecipe(raw);
  if (!v.ok) return json(400, { error: v.error });
  const data = v.data;

  let d;
  if (provider() === "mock") {
    d = mockDish(data.dish);
  } else {
    try {
      const { data: obj } = await askJson({
        prompt: buildRecipePrompt(data),
        maxTokens: 3000,
        signal: request.signal,
        log: "recipe",
        accept: (o) => o.error || hasRecipe(o.dish || o),
      });
      if (obj.error) return json(422, { error: "That doesn’t look like a dish name. Try something like “paneer butter masala”." });
      d = obj.dish && typeof obj.dish === "object" ? obj.dish : obj;
    } catch (err) {
      if (err?.name === "AbortError") return new Response(null, { status: 499 });
      return errorResponse(err instanceof AIError ? err : new AIError(503, String(err?.message || err)));
    }
  }
  if (!hasRecipe(d)) return json(502, { error: "The AI sent something we couldn’t read. Try again." });
  // Gibberish sometimes comes back as an unrelated recipe; the answer must share a word with what was typed.
  if (provider() !== "mock" && !relatedName(data.dish, `${d.name || ""} ${d.tagline || ""}`)) {
    console.warn(`[recipe] unrelated answer for "${data.dish}": "${d.name}"`);
    return json(422, { error: "That doesn’t look like a dish name. Try something like “paneer butter masala”." });
  }

  const times = checkTimes(d, { prepped: data.prepped });
  delete d.minutes;
  Object.assign(d, { prepMin: times.prepMin, cookMin: times.cookMin, soakHours: times.soakHours });
  // Macros from the ingredient list when nearly every ingredient could be priced.
  const rc = provider() === "mock" ? { coverage: 0, kcal: 0 } : recompute(d);
  if (rc.coverage >= 0.8 && rc.kcal > 0) Object.assign(d, { protein: rc.protein, carbs: rc.carbs, fat: rc.fat });
  d.uses = [];
  d.extra = [];
  return json(200, { dish: d });
}

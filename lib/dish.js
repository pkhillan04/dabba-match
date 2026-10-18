// Checks a dish from the AI before it reaches the page: does it have a usable recipe, and is its
// cooking time honest? Models often claim "10 minutes" for things that can't be done that fast,
// so each dish gets a minimum time from what it actually uses (see RULES), and its prep and cook
// times are raised to that minimum when they are lower. Minimums come from typical Indian
// home-recipe timings (pressure-cooker dals, soaked rajma/chole, marinated tikka and so on).

import { TIME_LIMITS } from "./prompt.js";

// Matched against ingredient names (plus the dish name and steps where noted). `total` is the
// least prep + cook in minutes; `soak` is hours of soaking ahead. Skipped when the dish uses
// ready-cooked versions (canned, boiled, leftover), and protein rules skip in meal-prep mode.
const READY = /\b(canned|tinned|boiled|cooked|leftover|sprout|sprouted|roasted|bhuna|puffed)\b/i;
const RULES = [
  { re: /\b(rajma|kidney beans?|chole|kabuli|chick ?peas?|kala chana|lobia|black[- ]eyed)\b/i, total: 45, soak: 6, protein: true },
  { re: /\b(mutton|goat|lamb)\b/i, total: 60, protein: true },
  { re: /\bchicken\b/i, total: 25, curry: 40, protein: true },
  { re: /\b(fish|rohu|basa|surmai|pomfret|salmon)\b/i, total: 20, curry: 30, protein: true },
  { re: /\b(prawns?|shrimps?|jhinga)\b/i, total: 15, protein: true },
  { re: /\bchaap\b/i, total: 25, curry: 40, protein: true }, // packs are usually pre-boiled
  { re: /\b(soya?|soy) (chunks?|granules|badi)\b|\bnutrela\b/i, total: 20, protein: true },
  { re: /\b(toor|arhar|chana|urad|tuvar)\s+dal\b/i, total: 35, protein: true },
  { re: /\b(dal|daal|lentils?|moong|masoor)\b/i, total: 25, protein: true },
  { re: /\bbrown rice\b/i, total: 35 },
  { re: /\b(rice|chawal|basmati)\b/i, total: 25, not: /\b(flour|noodles?|poha|flakes|puffed|murmura)\b/i },
  { re: /\b(quinoa|dalia|broken wheat|pasta|macaroni|spaghetti|penne)\b/i, total: 20 },
  { re: /\b(potato|aloo|sweet potato|shakarkandi)\b/i, total: 20 },
];
// "Curry" style dishes need longer simmering than a quick stir-fry of the same protein.
const CURRY = /\b(curry|masala|gravy|korma|rogan|keema|handi|kadai|kadhai|butter|makhani|do pyaza)\b/i;
const MARINADE = /\bmarinat|\btikka\b/i;
const DOUGH = /\b(knead|dough|roll out|roll into|paratha|rotis?|chapatis?|puris?)\b/i;
const FLOUR = /\b(atta|wheat flour|maida|bajra|jowar|ragi|makki|flour)\b/i;
const COOKS = /\bsaut|\b(heat|cooks?|cooked|cooking|fry|fried|boil\w*|roast\w*|toast\w*|simmer\w*|pressure|tadka|grill\w*|bake\w*|microwave\w*|steam\w*|whistles?|tawa|pan|kadai|kadhai)\b/i;
// About 2 minutes of washing and chopping per vegetable, 1 for small aromatics.
const BIG_VEG = /\b(onions?|pyaz|tomato(es)?|capsicum|shimla|carrots?|gajar|cucumber|kheera|cabbage|patta gobhi|beans|spinach|palak|methi|cauliflower|gobhi|mushrooms?|bhindi|okra|baingan|eggplant|brinjal|lauki|tori|pumpkin|kaddu|beetroot|mooli|radish|broccoli|sarson|zucchini|potato(es)?|aloo|sweet potato|peas|matar)\b/i;
const SMALL_VEG = /\b(ginger|adrak|garlic|lehsun|green chill(i|ies)|hari mirch|coriander|dhania|pudina|mint|spring onions?)\b/i;

function n(v) {
  v = Number(v);
  return Number.isFinite(v) && v > 0 ? v : 0;
}

export function hasRecipe(d) {
  return Array.isArray(d.ingredients) && d.ingredients.length > 0 && Array.isArray(d.steps) && d.steps.length > 0;
}

// Returns honest { prepMin, cookMin, soakHours } and whether anything was raised.
export function checkTimes(d, data = {}) {
  const ings = (Array.isArray(d.ingredients) ? d.ingredients : []).map((i) => String(i?.name || i || ""));
  const steps = (Array.isArray(d.steps) ? d.steps : []).map(String).join(" ");
  const name = String(d.name || "");
  const isCurry = CURRY.test(name);

  let prep = n(d.prepMin);
  let cook = n(d.cookMin);
  if (!prep && !cook) cook = n(d.minutes); // older format: one number
  let soak = n(d.soakHours);

  // Anything heated takes at least 15 minutes with chopping (egg bhurji, poha); no-cook at least 5.
  let minTotal = COOKS.test(steps) ? 15 : 5;
  let minSoak = 0;
  for (const r of RULES) {
    const hit = ings.find((i) => r.re.test(i) && !READY.test(i) && !(r.not && r.not.test(i)));
    if (!hit || (r.protein && data.prepped)) continue;
    minTotal = Math.max(minTotal, isCurry && r.curry ? r.curry : r.total);
    if (r.soak) minSoak = Math.max(minSoak, r.soak);
  }

  let minPrep = 0;
  for (const i of ings) minPrep += BIG_VEG.test(i) ? 2 : SMALL_VEG.test(i) ? 1 : 0;
  minPrep = Math.min(minPrep, 15);
  // Chopping happens while the marinade sits, so count whichever is longer.
  if (MARINADE.test(steps) || MARINADE.test(name)) {
    minPrep = Math.max(minPrep, 15);
    minTotal = Math.max(minTotal, 35);
  }
  // Rotis or parathas from flour add about 15 minutes: kneading, then rolling and cooking them
  // while the sabzi simmers (a paneer kathi roll with homemade rotis is ~45-50 min in total).
  if (ings.some((i) => FLOUR.test(i)) && DOUGH.test(steps)) {
    minPrep += 5;
    minTotal = Math.max(minTotal + 15, 30);
  }

  const before = [prep, cook, soak].join();
  prep = Math.max(prep, minPrep);
  if (prep + cook < minTotal) cook = minTotal - prep;
  soak = Math.max(soak, minSoak);
  const out = { prepMin: Math.round(prep), cookMin: Math.round(cook), soakHours: Math.round(soak) };
  return { ...out, adjusted: before !== [out.prepMin, out.cookMin, out.soakHours].join() };
}

// Does a (checked) dish fit the chosen time filter? Dishes that need soaking ahead only fit "long".
export function fitsTime(d, time) {
  const lim = TIME_LIMITS[time] || TIME_LIMITS.any;
  if (lim.max === Infinity) return true;
  if (d.soakHours > 0 && time !== "long") return false;
  return d.prepMin + d.cookMin <= lim.max;
}

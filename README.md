# Dabba Match

**Live: https://dabba-match.vercel.app** — no login, works on a phone.

Pick what's actually in your kitchen and get three dishes sized to your next
meal's calorie and protein target. Built because I bulk-cook protein, get bored
eating the same thing, and don't want to do arithmetic to find out whether a
substitution still hits my macros.

It's in real use by me and my sister. One HTML file, four serverless endpoints,
no build step, no framework, no database.

## The parts worth reading

**Fitting a dish to your macros without lying about it** — `lib/nutrition.js`

An LLM asked for "a dish with 45g protein and 600 kcal" will confidently return
ingredient amounts whose macros don't add up. So the model's amounts are treated
as a starting guess and then solved properly: each ingredient gets a multiplier,
found by coordinate descent over ~12 sweeps against a built-in per-100g nutrition
table.

The bounds are the interesting bit. They're per ingredient type, because the
scaling a real cook will accept isn't uniform — fat sources move within
0.3–1.3x (doubling the ghee ruins the dish), low-calorie vegetables get
0.7–1.5x, everything else 0.4–1.8x. Ingredients contributing under 15 kcal are
pinned at 1x, since rescaling a pinch of salt is noise. A small penalty term
keeps multipliers near 1 so the solver prefers small honest nudges over dramatic
rewrites, and dry-basis ingredients get a cooked-weight conversion when the name
says they're cooked.

Then it rounds to amounts a kitchen can actually measure, **recomputes the macros
from the rounded numbers**, and — the part I care about — **throws the result away**
if ingredient coverage is under 80% or the fit didn't improve the error by at
least 20%. A bad fit shows nothing rather than a confident wrong number.

**A model fallback chain that respects the platform's deadline** — `lib/ai.js`

Gemini's free tier returns 429s and 503s constantly, so requests walk a chain of
models. The parts that took real debugging:

- Vercel kills a serverless function at 60 seconds. The chain tracks total
  elapsed time and refuses to start another model with under 5 seconds left,
  so a user gets a clean error instead of a dead connection.
- Retryable failures (404, 429, 500, 503) advance to the next model. A 401 or
  403 aborts the whole chain immediately — a bad API key will not work better on
  the next model, and burning the remaining budget to prove it is pointless.
- Each attempt passes through a validator, so a response that parses as JSON but
  is semantically wrong counts as a failure and falls through. Early on, models
  would echo the target macros back as the dish's macros; that check catches it.
- Every attempt is logged with its outcome, so production logs say which model
  answered and why the earlier ones didn't.

**Macro targets** — Mifflin-St Jeor BMR, activity multiplier, goal-pace
adjustment, protein scaled by g/kg against goal, split across training and rest
days. An earlier version had a bug where a "fast" pace applied +15% on top of an
already-adjusted figure and quietly produced a 3,599 kcal target; it's covered in
the calculator now.

**Everything else:** cook mode with step timers that parse durations written as
words, photo-based ingredient scanning, a calorie log, and a recently-cooked
history so it stops suggesting the thing you ate yesterday.

## What's in this folder

| Path | What it is |
|---|---|
| `public/index.html` | The whole front end — design, onboarding, calculator, profile, results. One file, no build step. |
| `api/dishes.js` | Main endpoint. Holds the AI key server-side, builds the prompt, streams dishes back over SSE. |
| `api/recipe.js`, `api/food.js`, `api/scan.js` | Recipe detail, food logging, photo ingredient scan. |
| `lib/ai.js` | Provider abstraction, model fallback chain, rate limiting, JSON extraction. |
| `lib/nutrition.js` | Nutrition table, macro recomputation, `fitToTarget`. |
| `lib/dish.js` | Dish validation and cooking-time checks. |
| `lib/prompt.js` | Validates the request and writes the prompt. |
| `dev-server.mjs` | Local dev server. |
| `CLAUDE.md` | Project notes for Claude Code sessions. |

## Honest notes

- The nutrition table is hand-built and Indian-ingredient-heavy. Unknown
  ingredients reduce coverage, and low coverage makes the fitter decline rather
  than guess.
- Profiles live in `localStorage`. Clear your browser and you start over. There
  is no account system and no server-side storage of anything personal.
- On Gemini's free tier, Google may use prompts to improve its models. Prompts
  carry macros, ingredients and diet choices — never names.
- This is a nutrition estimator, not dietary advice.

Built with Claude as a coding partner.

## One-time setup (about 15 minutes)

You need: a Mac terminal, Node.js 20 or newer (`node -v` to check; install from nodejs.org if missing), and a paid Claude plan (Pro or higher) for Claude Code.

### 1. Get a free Gemini API key
1. Go to https://aistudio.google.com/apikey and sign in with Google.
2. Click **Create API key** and copy it. No card needed.

### 2. Put the key in the project
In the project folder, copy `.env.example` to a new file named `.env.local` and paste your key after `GEMINI_API_KEY=`.
Never share this file or paste the key anywhere public.

### 3. Try it on your laptop
```bash
cd path/to/dabba-match
npm run dev
```
Open http://localhost:3000. Use `npm run dev:mock` to test with fake dishes that cost nothing.

### 4. Put it online with Vercel (free)
```bash
npx vercel login          # one time: sign in with GitHub or email
npx vercel                # first deploy: accept the defaults it suggests
npx vercel env add GEMINI_API_KEY production    # paste your key when asked
npx vercel --prod         # deploy again so the key is picked up
```
Vercel prints your link, like `https://dabba-match.vercel.app`. Send that to anyone. They open it and use it, no account needed.

To update the live site after changes: `npx vercel --prod`.

## Switching the AI model

No code change needed. In Vercel (Project → Settings → Environment Variables) or in `.env.local`:

| Setting | Effect |
|---|---|
| `AI_PROVIDER=gemini` | Default. Uses Google Gemini. Free tier has daily limits. |
| `GEMINI_MODELS=a,b,c` | Backup chain of Gemini models, tried in order. Default `gemini-3.8-flash,gemini-3.5-flash-lite,gemini-3.6-flash,gemini-3.1-flash-lite`. If one is busy, out of free quota, or slow (no answer within 7 s, or stuck for 10 s partway), the next takes over, even partway through a request. |
| `AI_PROVIDER=anthropic` + `ANTHROPIC_API_KEY=...` | Use Claude instead (default `claude-haiku-4-5`). Paid, about half a cent per request. |
| `AI_PROVIDER=mock` | Fake dishes, for testing. |

Redeploy (`npx vercel --prod`) after changing settings.

## Good to know
- **Free tier privacy:** on Gemini's free tier Google may use prompts to improve its models. Prompts contain macros, ingredients and diet choices, never names. Switch to a paid key before launching to real users.
- **Busy AI:** the free tier often returns "high demand" or quota errors. The app quietly switches to the next model in `GEMINI_MODELS`; visitors only see "busy, try again" if every model fails. Vercel logs show which model answered each request (search `answered_by`).
- **Abuse protection:** each visitor is limited to 15 requests per 5 minutes. On the free tier Google's own daily cap also stops runaway use, so there's no surprise bill.
- **Data:** profiles live in each visitor's browser (localStorage). Clearing browser data or switching devices means setting up again.

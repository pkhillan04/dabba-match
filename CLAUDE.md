# Dabba Match — notes for Claude Code

## What this is
A no-login web app: users set up a profile (body stats, goal, diet), pick ingredients they have, and get 3 AI-suggested dishes sized to one meal's macro target. A Today tab tracks what they've eaten against the day's target. Owner is a beginner returning to coding; explain changes in plain language and keep the setup simple.

## Structure
- `public/index.html` — the entire frontend: HTML, CSS and vanilla JS in one file. No framework, no build step. Deployed as static files.
- `api/dishes.js` — Vercel Function (Web `Request`/`Response`, named `GET`/`POST` exports). Validates input, builds the prompt server-side, calls the AI provider, streams plain text back: exactly 3 lines, one minified JSON dish per line (2 lines when the payload has `mode: "gap"`). Walks a model fallback chain (`GEMINI_MODELS`): on 404/429/500/503, or no text within 7 s (`FIRST_TEXT_MS`), it tries the next model; a 10 s stall mid-answer (`STALL_MS`) counts as stopping partway; if one stops partway it asks the next only for the missing dishes (finished names passed as "already shown"). The server parses lines itself so it knows which dishes are finished. Waits for the first dish before replying, so total failure returns a real 503/429 JSON error. Lines with a comma where a field's colon belongs (`"tagline","..."`, a gemini-3.5-flash-lite habit) are repaired by `fixFieldCommas()` before parsing. Dishes whose protein, carbs and fat all equal the target (copied, not calculated) are always dropped and topped up from the next model, never shown. Logs one `[dishes] ... answered_by=...` line per request, plus a `[dishes] unreadable model=...` warning with a sample of any reply text that couldn't be read as a dish, and a `[dishes] cut-off model=... finish=...` warning when a reply stops mid-dish. The chain shows each model's finish reason in braces, e.g. `{STOP}`, `{MAX_TOKENS}`, `{no finish}`. Gemini sometimes reports "high demand" as plain JSON after the events; `sseText()` treats that as a 503.
- `lib/prompt.js` — `validatePayload()` and `buildPrompt()`. The client never sends raw prompts; keep it that way so the endpoint can't be abused as a general chatbot.
- `dev-server.mjs` — zero-dependency local server that mimics Vercel. Loads `.env.local`.
- `vercel.json` — serves `public/` as the site; 60s max duration for the function.

## Commands
- `npm run dev` — local server at http://localhost:3000 using the real provider from `.env.local`.
- `npm run dev:mock` — same, with fake dishes (no API key, no cost). Prefer this while developing UI.
- Deploy: push to `main` on GitHub (private repo `pkhillan04/dabba-match`); Vercel builds it automatically. `npx vercel --prod` still works for a manual deploy.

## Key frontend concepts (public/index.html)
- `state` object persisted to localStorage key `dabbamatch_v4` (`save()` / `load()`). `load()` migrates the older `dabbamatch_profile_v3` format. If you change the state shape, keep old data loading.
- `calcTargets()` — macro engine: Mifflin-St Jeor BMR × activity factor; goal adjustment from % bodyweight per week (7,700 kcal/kg), capped at −25% / +15% of TDEE; protein g/kg by goal (lose 2.2, recomp 2.0, maintain 1.8, gain 2.0) on a reference weight capped at BMI 27.5; fat 27% kcal with 0.6 g/kg floor; carbs remainder; training days ~12% above rest days with the weekly average preserved; floors 1,200 kcal (female) / 1,500 (male). If you change this, re-test against known profiles.
- `mealTarget()` — daily target ÷ meals per day, skewed by macro focus.
- `streamDishes()` — shared fetch + stream parser for `/api/dishes` (uses `tryParseLine()`, calls back per dish). `generate()` (Cook tab) and `closeGap()` (Today tab) both use it.
- Two screens: Cook (`#mainView`) and Today (`#todayView`), switched by `state.view` via `renderView()`.
- Today tab: `state.usualMeals` (set once, ticked daily) and `state.dayLog` (`{ "YYYY-MM-DD": [items] }`, last 14 days, pruned in `saveLog()`). "Cooked this" (`markCooked(name, dish)`) also logs the dish. `gapTarget()` = what's left today, capped at ~1 meal; "Close my gap" sends it with `mode:"gap"`.
- Tone on Today is no-shame: going over target shows "Target reached", never red or warning colours.
- Rendering is plain functions (`renderTarget`, `renderKitchen`, `renderResults`, `renderProfile`, …) writing innerHTML. Always pass user or AI text through `esc()`.
- Design tokens are CSS variables on `:root` with dark-mode overrides. Use the tokens; don't hardcode colors. Fonts: Bricolage Grotesque (display) and Figtree (body).

## Rules
- Never put API keys in `public/` or commit `.env.local`.
- Keep the app working without login.
- Test changes with `npm run dev:mock` in a browser at phone width (~390px) and desktop before deploying.

## Ideas backlog (owner's roadmap)
- Save favourite dishes; "cook again" list.
- Weekly grocery list from cooked dishes.
- Daily log history: look back at past days (last 14 are already stored in `state.dayLog`).
- Share a dish as an image or link.
- Hindi / Hinglish language option.
- Basic anonymous usage analytics to see if people come back (needed before thinking about a business).

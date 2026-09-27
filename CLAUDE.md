# Dabba Match — notes for Claude Code

## What this is
A no-login web app: users set up a profile (body stats, goal, diet), pick ingredients they have, and get 3 AI-suggested dishes sized to one meal's macro target. Owner is a beginner returning to coding; explain changes in plain language and keep the setup simple.

## Structure
- `public/index.html` — the entire frontend: HTML, CSS and vanilla JS in one file. No framework, no build step. Deployed as static files.
- `api/dishes.js` — Vercel Function (Web `Request`/`Response`, named `GET`/`POST` exports). Validates input, builds the prompt server-side, calls the AI provider, streams plain text back: exactly 3 lines, one minified JSON dish per line.
- `lib/prompt.js` — `validatePayload()` and `buildPrompt()`. The client never sends raw prompts; keep it that way so the endpoint can't be abused as a general chatbot.
- `dev-server.mjs` — zero-dependency local server that mimics Vercel. Loads `.env.local`.
- `vercel.json` — serves `public/` as the site; 60s max duration for the function.

## Commands
- `npm run dev` — local server at http://localhost:3000 using the real provider from `.env.local`.
- `npm run dev:mock` — same, with fake dishes (no API key, no cost). Prefer this while developing UI.
- `npx vercel --prod` — deploy to production.

## Key frontend concepts (public/index.html)
- `state` object persisted to localStorage key `dabbamatch_v4` (`save()` / `load()`). `load()` migrates the older `dabbamatch_profile_v3` format. If you change the state shape, keep old data loading.
- `calcTargets()` — macro engine: Mifflin-St Jeor BMR × activity factor; goal adjustment from % bodyweight per week (7,700 kcal/kg), capped at −25% / +15% of TDEE; protein g/kg by goal (lose 2.2, recomp 2.0, maintain 1.8, gain 2.0) on a reference weight capped at BMI 27.5; fat 27% kcal with 0.6 g/kg floor; carbs remainder; training days ~12% above rest days with the weekly average preserved; floors 1,200 kcal (female) / 1,500 (male). If you change this, re-test against known profiles.
- `mealTarget()` — daily target ÷ meals per day, skewed by macro focus.
- `generate()` — POSTs `buildPayload()` to `/api/dishes`, parses streamed lines with `tryParseLine()`, renders each dish as it arrives.
- Rendering is plain functions (`renderTarget`, `renderKitchen`, `renderResults`, `renderProfile`, …) writing innerHTML. Always pass user or AI text through `esc()`.
- Design tokens are CSS variables on `:root` with dark-mode overrides. Use the tokens; don't hardcode colors. Fonts: Bricolage Grotesque (display) and Figtree (body).

## Rules
- Never put API keys in `public/` or commit `.env.local`.
- Keep the app working without login.
- Test changes with `npm run dev:mock` in a browser at phone width (~390px) and desktop before deploying.

## Ideas backlog (owner's roadmap)
- Save favourite dishes; "cook again" list.
- Weekly grocery list from cooked dishes.
- Daily log: mark which meal of the day this is and show remaining macros.
- Share a dish as an image or link.
- Hindi / Hinglish language option.
- Basic anonymous usage analytics to see if people come back (needed before thinking about a business).

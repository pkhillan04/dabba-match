# Dabba Match

Cook with what you have. Hit your macros.

Pick what's in your kitchen and get three dishes sized to your next meal's calories and protein. Targets are calculated from your body and goal (Mifflin-St Jeor + activity + goal pace). No login: each person's profile is saved in their own browser.

## What's in this folder

| Path | What it is |
|---|---|
| `public/index.html` | The whole app (design, onboarding, calculator, profile, results). One file, no build step. |
| `api/dishes.js` | Server endpoint the app calls. Holds your secret AI key, builds the prompt, streams dishes back. |
| `lib/prompt.js` | Checks what the app sends and writes the prompt for the AI. |
| `dev-server.mjs` | Runs everything on your laptop for testing. |
| `.env.example` | Template for your secret keys. Copy to `.env.local`. |
| `CLAUDE.md` | Notes Claude Code reads automatically when you work on this project. |

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
| `GEMINI_MODELS=a,b,c` | Backup chain of Gemini models, tried in order. Default `gemini-3.5-flash-lite,gemini-3.8-flash,gemini-3.6-flash,gemini-3.1-flash-lite`. If one is busy or out of free quota, the next takes over (even partway through a request). |
| `AI_PROVIDER=anthropic` + `ANTHROPIC_API_KEY=...` | Use Claude instead (default `claude-haiku-4-5`). Paid, about half a cent per request. |
| `AI_PROVIDER=mock` | Fake dishes, for testing. |

Redeploy (`npx vercel --prod`) after changing settings.

## Good to know
- **Free tier privacy:** on Gemini's free tier Google may use prompts to improve its models. Prompts contain macros, ingredients and diet choices, never names. Switch to a paid key before launching to real users.
- **Busy AI:** the free tier often returns "high demand" or quota errors. The app quietly switches to the next model in `GEMINI_MODELS`; visitors only see "busy, try again" if every model fails. Vercel logs show which model answered each request (search `answered_by`).
- **Abuse protection:** each visitor is limited to 15 requests per 5 minutes. On the free tier Google's own daily cap also stops runaway use, so there's no surprise bill.
- **Data:** profiles live in each visitor's browser (localStorage). Clearing browser data or switching devices means setting up again.

# Talent Bridge — web

React version of the Talent Bridge prototype (MentorME Futura Remix, Track 1). Next.js 16 App Router, TypeScript, Tailwind v4, deployable to Vercel's Sydney region.

## Run it

```bash
npm install
npm run dev            # http://localhost:3000
npm run verify         # typecheck, lint, 36 tests, production build
```

Optional, to use Claude:

```bash
cp .env.example .env.local      # add ANTHROPIC_API_KEY
npm run precompute              # Claude extracts claims for the 8 sample candidates, once
npm run build
```

Without a key everything still works: extraction uses keyword rules, viva questions come from templates, and grading uses the rule-based rubric.

## Pages

| Route | What it shows |
|---|---|
| `/` | The problem (OECD graduate employment gap, interactive), the three steps, and evaluation numbers computed at build time |
| `/employer` | Blind shortlist beside a detail panel: match ring, why they match, how the score is built, gaps to ask about, redacted evidence, qualification and grades in Australian terms, reveal identity. Editable target levels re-rank the list live. Identity-swap fairness test |
| `/employer/dashboard` | The whole pool against the role: a filter panel (minimum match, must-meet skills, gaps allowed, qualification, grade average, defended work sample, evidence quality, editable targets), an aggregate profile of every shown candidate against your targets, a cumulative curve of how many clear each match score, then the heatmap, score build, coverage, pipeline, evidence and qualification charts. "Post a job" turns a pasted ad into requirements and suggested filters |
| `/candidates` → `/candidates/[id]` | Candidate passports, with every task backed by exact quotes, tiers and level caps |
| `/work-sample/[id]` | Gaps → seeded task → viva → reviewer → result and Open Badges 3.0 portfolio card |
| `/workforce` | Hire-ready vs one gap away, coverage per requirement, the planning signal, evidence quality |
| `/method` | The scoring rules in full, evaluation results and known limits |

## Themes

Burgundy and beige, in light and dark. The header toggle switches between them with a circular reveal (a view transition, skipped under reduced motion). The site opens in light whatever the computer's own setting, and remembers the choice once someone switches to dark. An inline script sets the theme before first paint, so dark mode never flashes light.

Tokens are three layers in `src/app/globals.css`: primitives, then semantic roles (light by default, overridden under `:root[data-theme="dark"]`), then component shadows. Components only use semantic tokens. Burgundy is the brand and evidence strength, sage means "meets" or "pass" so burgundy never reads as an error, and ochre marks gaps. Every text pair meets WCAG AA in both themes, checked with axe on all seven pages.

## Animation

Built on React's `<ViewTransition>` following Vercel's `vercel-react-view-transitions` skill, with no animation library:

- **Shared element:** a candidate's avatar and name morph from the list card into their passport
- **Directional navigation:** list ↔ passport ↔ work sample slide forward and back (`transitionTypes` on `next/link`)
- **List identity:** the shortlist and coverage bars glide into their new order when you change a target level
- **Ordered steps:** the work-sample stepper slides forward and back between steps
- **Enter/exit:** the detail panel crossfades between candidates; the fairness result slides up
- Match ring, meters and counters animate on change; everything respects `prefers-reduced-motion`

Recipes are in `src/app/globals.css`. View transitions need Chromium 125+, Safari 18.2+ or Firefox 144+; other browsers simply don't animate.

## Posting a job

Paste a job ad on the dashboard and `src/lib/engine/posting.ts` maps it to the OSCA Data Analyst tasks using each task's keywords, sentence by sentence. The title and opening line set seniority (junior, mid or senior, which sets the base target level), words like "must" or "strong" raise the weight, "nice to have" or "familiarity" drop the target to Foundation and halve the weight, and a required degree becomes an AQF filter. Every requirement shows the sentence it came from, and the employer can adjust anything before posting. Posted jobs are saved in the browser and appear on the shortlist, dashboard, workforce and work-sample pages. It's rule-based on purpose: every requirement can be traced and checked.

## Qualifications in Australian terms

Personal details (name, country, university, employers) stay hidden until the employer moves someone forward. What the employer does see is the qualification as an indicative AQF level and each unit grade on the common Australian scale (HD 85, D 75, C 65, P 50), with a 7-point GPA.

`src/data/qualifications.json` holds each transcript's award, AQF level, unit grades and the issuer's grading legend. `src/lib/engine/qualifications.ts` rescales a foreign grade so its pass mark sits at 50 and its top at 100, then takes the bottom of its band, so a converted grade never reads higher than it was. The original grades and scale are shown only after reveal, since a scale such as 1.0 to 5.0 can hint at where someone studied. Grades are shown, not scored: the match is unchanged. `tests/qualifications.test.ts` checks every grade is quoted verbatim from the transcript and that nothing shown blind contains a personal detail.

## Engine

`src/lib/engine/` is a TypeScript port of the Python engine: extraction, scoring, matching, fairness, work-sample generator, grader, viva, portfolio. `tests/parity.test.ts` proves it produces the same passports, claims, rankings and identity-swap rewrites as the Python version (fixture exported from it). `tests/eval.test.ts` runs the six evaluation checks plus the verbatim-quote check.

Two differences from the Python app:

- **Work-sample datasets** use a different seeded generator, so seed 4821 gives a different CSV here than in Python. Same structure, planted issues and rules.
- **Attempts and revealed identities are stored in the browser** (`localStorage`, versioned key), because Vercel functions have no persistent disk. Each viewer has their own demo state. "Presenter tools: reset" on the work-sample page clears a candidate.

The LLM only maps text to tasks. `/api/assist` handles work-sample grading suggestions, viva questions and the consistency check. It returns `{available:false}` without a key or with `DEMO_MODE=offline`, and the UI falls back to rules and templates.

## Deploy to Vercel

1. Push this folder to a GitHub repo and import it at vercel.com/new (framework: Next.js, no settings to change). `vercel.json` pins the functions to `syd1`.
2. Environment variables, all optional: `ANTHROPIC_API_KEY`, `LLM_MODEL` (default `claude-sonnet-5`), `DEMO_MODE=offline` to force fallbacks on stage, `NEXT_PUBLIC_DEMO_SEED=4821` to fix the work-sample dataset for a rehearsed demo.
3. Commit `src/data/llm-claims.json` after `npm run precompute` if you want Claude-extracted passports in production; they're built in statically.

## Known limits

- Redaction hides names, countries, universities and employers. City names and pronouns can still leak.
- Grade conversion lines up pass marks but not marking strictness, and the AQF level is indicative, not a formal assessment.
- Level cues are keyword rules, and the gold labels were written by the team. Treat precision as indicative.
- Scoring weights are starting assumptions, not calibrated values.
- One work-sample template covers Data quality, Analysis and Scripting. Visualisation has no task yet.
- All sample candidates and employers are fictional.

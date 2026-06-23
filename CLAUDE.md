# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

> **Heads up on Next.js:** This repo pins `next@16.2.3` / `react@19`, which differ
> from older mental models. Per `AGENTS.md`, before writing Next.js/React code read
> the relevant guide in `node_modules/next/dist/docs/` rather than relying on
> training-data conventions.

## What this is

A mobile-first live scoring app for a 4-player, 4-round golf trip at Barefoot
Resort. The four players (Derek, Pat, Joey, Matt) and the four courses/formats
are hard-coded (`src/lib/types.ts`). All four phones load the same active trip
and see each other's edits live via Supabase Postgres real-time subscriptions —
there is no auth and no per-user data; "logging in" just picks which of the four
named players you are (stored in `localStorage`).

The four rounds and their scoring formats are fixed:
- **R1 (index 0) — Barefoot Love:** 6-6-6 Scotch
- **R2 (index 1) — Barefoot Fazio:** Wolf
- **R3 (index 2) — Barefoot Norman:** 6-6-6 Scotch
- **R4 (index 3) — Barefoot Dye:** 2-Man Scramble

Rounds are referenced everywhere by their 0-based index.

## Commands

```bash
npm run dev      # dev server at http://localhost:3000
npm run build    # production build (also the de-facto typecheck — there is no test suite)
npm run start    # serve the production build
npm run lint     # eslint (flat config, eslint-config-next core-web-vitals + typescript)
```

There are **no tests** and no test runner configured. `npm run build` is the
closest thing to CI; run it to surface type errors before committing. There is
no separate `tsc` script — TypeScript is checked through the Next build.

## Environment

Supabase is reached through `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` (`src/lib/supabase.ts`). Both fall back to
`placeholder` values so the app still builds without a `.env`, but it won't read
or write data. `.env*` is gitignored.

## Architecture

### Data flow: one Context over Supabase

`src/lib/context.tsx` (`TripProvider` / `useTripContext`) is the heart of the
app. It is the single source of truth that every screen reads from and writes
through. It:

- Loads the most recent trip whose `status` is `setup` or `active` (there is
  effectively one "live" trip at a time).
- Subscribes to Postgres real-time changes on four tables and merges incoming
  rows into local React state, so all devices stay in sync.
- Exposes typed getters/setters (`getScore`/`setScore`, `getHoleExtra`/
  `setHoleExtra`, `getScrambleScore`/`setScrambleScore`, handicap/net helpers,
  setup mutations like `drawScotchTeams`, `setWolfTeeOrder`, betting, etc.).

Writes use Supabase `upsert` with `onConflict` on the natural keys and then
optimistically patch local state; the real-time subscription reconciles other
devices. **When adding any persisted field, go through the context** — components
should not call `supabase` directly.

### Supabase tables (inferred from `src/lib/types.ts`)

- `trips` — one row per trip; holds players, per-course pars & hole handicaps,
  team configuration (`scotch_teams`, `wolf_tee_order`, `scramble_teams_override`),
  `bet_amounts`, `scramble_strokes`, `status` (`setup` | `active` | `complete`),
  and `commissioner`. `round_teams` is a legacy column kept only for DB compat.
- `scores` — gross score per (trip, round, player, hole). Conflict key:
  `trip_id,round,player,hole`.
- `hole_extras` — per (trip, round, hole) metadata that drives bonus points:
  closest-GIR/CTP winner, wolf pick/partner/spit, press / double-press flags.
  Conflict key: `trip_id,round,hole`.
- `scramble_scores` — one gross score per (trip, hole, team) for R4. Conflict
  key: `trip_id,hole,team`.

### Scoring logic lives in `src/lib/games.ts` (pure functions)

All game math is pure and isolated here, separate from React. This is where the
real domain complexity is — read it before touching any scoring:

- **6-6-6 Scotch** (`calcScotchHole` / `calcScotchRound`): 18 holes split into
  three 6-hole segments, each a different 2v2 pairing (`ScotchTeams`, the same
  pairings reused for R1 and R3). Up to 6 points/hole: 2 low-individual-NET,
  2 low-team-total-NET, 1 closest-GIR/CTP, 1 **natural** (gross) birdie. A clean
  sweep with a natural birdie doubles the hole to 12.
- **Wolf** (`getWolfForHole` / `calcWolfHole` / `calcWolfRound`): wolf rotates by
  `hole % 4` over the tee order. Same 6-point system; lone wolf / spit doubles
  all points on the hole.
- **Scramble** (R4): team net via `scrambleNetScore`; teams default to pairing
  best+worst vs middle two by Stableford (`getScrambleTeams`) unless
  `scramble_teams_override` is set.
- **Stableford / handicaps**: `calcStableford`, `courseHandicap`,
  `strokeHoles`, `netScore`, `scrambleHandicap`.

`src/lib/types.ts` holds the constants and lighter helpers: player names, the
four `ROUNDS` (par/slope/rating/tee time), `DEFAULT_PARS` and
`DEFAULT_HOLE_HANDICAPS` per course, `ALL_PAIRINGS`, and the score-coloring
helpers (`getScoreColor`/`getScoreBg`, keyed on **net** score vs par).

> Note: `context.tsx` reimplements the net/course-handicap helpers inline against
> live trip data, while `games.ts` has standalone versions used by the round
> calculators. Keep the two consistent if you change handicap rules.

### UI: single page, tabbed client app

`src/app/page.tsx` mounts `TripProvider` → `MainApp`. The whole app is one
client route (`'use client'` throughout; `src/app` only holds `page.tsx`,
`layout.tsx`, and `globals.css`). `MainApp` (`src/components/MainApp.tsx`) gates
on state: no player → `PlayerSelect`; trip missing or `status === 'setup'` →
`SetupScreen`; otherwise a tab bar over the four rounds + `Summary`. The active
tab persists in `localStorage` (`golf-active-tab`); the chosen player persists as
`golf-player`.

Components map roughly one-to-one to features: `ScotchRound`, `WolfRound`,
`ScrambleRound`, `Summary`, plus shared pieces (`Scorecard`, `HoleExtrasPanel`,
`PressPanel`, `BetPicker`, `RoundHandicapEditor`, `InfoModal`).

### Styling

Tailwind CSS v4 via PostCSS, configured entirely in `src/app/globals.css` (no
`tailwind.config.js`). A custom green/gold/cream palette is defined as CSS
variables and exposed as Tailwind colors through `@theme inline` — use classes
like `bg-green-deeper`, `text-gold`, `text-cream-dim`. `font-serif` is Playfair
Display. The app is designed for phones (fixed viewport, no zoom).

### Path aliases

`@/*` maps to `src/*` (`tsconfig.json`).

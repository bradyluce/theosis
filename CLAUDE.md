# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Theosis is an Orthodox Christian study app: verse-first patristic commentary, daily liturgical rhythm, library of Fathers, search. The **user-facing product is the Expo mobile app in [`apps/mobile/`](apps/mobile/)** — that's what the user is actively building and what testers run via EAS Updates. The Next.js app at the repo root (`src/`) now serves primarily as the **backend API** for mobile, plus the content pipeline and an older web reader surface. TypeScript strict everywhere. Path alias `@/*` → `./src/*` on the backend, `@/*` → `./apps/mobile/` inside the mobile app.

**When the user says "the app," "Settings," "Daily," "Reader," "the picker," tester feedback, build IDs, etc., assume they mean the mobile app — not `npm run dev` localhost.** Recent commit prefixes (`Mobile: …`) reflect this.

Product/architecture docs live in `docs/` (`product-plan.md`, `architecture.md`, `content-ingestion.md`, `mock-vs-real.md`, `calendar-strategy.md`). Read `.cursor/AGENTS.md` for the project's standing rules — the most important: never embed large text content in UI components, preserve provenance on every record, keep raw vs normalized content separate.

## Product surfaces

| Surface | Path | Role |
| --- | --- | --- |
| **Mobile app** | `apps/mobile/` | The product. Expo SDK 54, expo-router 6, Clerk Expo, TanStack Query, Reanimated 4. Hits the deployed Vercel backend by default — no local web server needed. |
| **Backend / web** | `src/` (root) | Next.js App Router on Vercel. Hosts the JSON API mobile reads (`/api/me/*`, `/api/bible/*`, `/api/commentary/*`, `/api/library/*`, `/api/calendar/*`, `/api/search/*`, `/api/parishes/*` — `near` / `geocode` / `[state]/[slug]`, `/api/topics`, `/api/guides`, `/api/daily`, `/api/reading-plans`, `/api/version`), the public `/privacy` and `/terms` pages, and a still-maintained web reader. |
| **Shared core** | `packages/core/` (`@theosis/core`) | Platform-agnostic: domain types (`BibleVerse`, `CommentaryEntry`, `Person`, `Work`, `WorkChapter`, `DailyCommemoration`, …), typed API client (`createTheosisApi` in `api/client.ts`), Drizzle schema (`db/schema.ts`), onboarding state machine (`onboarding/`). Both apps import from here. |

**The mobile app talks to the deployed Vercel backend (`https://theosis-app-brady-luces-projects.vercel.app`) by default**, even under `expo start`. To point mobile at a local Next.js server on your LAN (for testing unpushed backend changes), set `EXPO_PUBLIC_USE_LAN_DEV=1` before Metro and run `npm run dev:mobile` from the repo root. Resolution rules live in [apps/mobile/lib/api.ts](apps/mobile/lib/api.ts).

Persistence: Neon Postgres via Drizzle (`@neondatabase/serverless`). Auth is Clerk — `@clerk/nextjs` on the backend, `@clerk/clerk-expo` on mobile. Mobile keeps tokens in SecureStore and queues offline writes through `apps/mobile/lib/sync/`.

## Commands

```bash
# Mobile (the primary product) — run from repo root
npm run mobile             # → apps/mobile: expo start, hits Vercel backend by default
npm run mobile:clean       # same + --clear (drop Metro cache; after dep/babel changes)

# Backend / web + content pipeline
npm run dev                # Next dev server on localhost:3000 — for iterating on API routes
npm run dev:mobile         # Next dev on 0.0.0.0:3000 — pair with EXPO_PUBLIC_USE_LAN_DEV=1
npm run build              # Production build (Next)
npm run lint               # eslint (next/core-web-vitals + next/typescript) — backend only

# Database (Drizzle / Neon)
npm run db:generate        # generate SQL migration from schema diff
npm run db:push            # push schema directly (dev only)
npm run db:migrate         # run committed migrations against the configured DB
npm run db:studio          # open Drizzle Studio

# Content pipeline (see "Content pipeline" below)
npm run ingest:bibles
npm run normalize:bibles:demo
npm run ingest:commentary
npm run normalize:commentary
npm run ingest:icons
npm run ingest:icons:auto-curate
npm run ingest:parishes / normalize:parishes
npm run ingest:media / sync:media
npm run push:commentary:s3

# Tests
npm run test:calendar      # Calendar unit tests — plain tsx script with assert(), no framework
npm run test:parishes
```

There is no general test framework. `scripts/test/calendar.ts` runs assertions and exits non-zero on failure. To run a single calendar test, edit that file (or copy a block into a one-off `tsx` script) — it's not parameterized. Mobile has no test command yet; verify by running `npm run mobile` and exercising the screen.

## Architecture

### Two parallel content systems

1. **Bible text** — files on disk. Authoritative store is `content/normalized/bibles/<translationId>/<bookSlug>/<chapterNumber>.json`. Read via `src/lib/bible/server-store.ts` (`getNormalizedChapter`, `getChapterVerses`, etc.) — server-only, with an in-process cache. The API route `/api/bible/[translation]/[book]/[chapter]` (in `src/app/api/bible/.../route.ts`) tries S3 first (`BIBLE_S3_BUCKET` / `BIBLE_S3_REGION`, default `theosis-content` / `us-east-1`) and falls back to the local normalized files.

2. **Library content** (people, works, commentary, sources, topics, daily) — seeded TypeScript in `src/lib/content/seed/{library,daily,profile,saint-bios,scripture}.ts`, queried via `src/lib/content/queries.ts` (`getPersonById`, `getDirectCommentaryForVerse`, etc.). On top of seed, `src/lib/content/commentary-loader.ts` **merges in** sliced commentary content from `content/normalized/commentary/` (verse-keyed snippets — Catena Aurea, Augustine sermons, Chrysostom homily heads, Azkoul, ~85 Fathers) and long-form prose from `content/normalized/library/` (full readable WorkChapters — Augustine Confessions, Chrysostom homily bodies, Tertullian treatises, etc.). Each tree has its own `catalog.json` with people/works/sources/index; per-section files are lazy-loaded on demand, cached per key for the process lifetime. The reader page (`src/app/(shell)/bible/[translation]/[book]/[chapter]/page.tsx`) and library work/person pages use this loader; older code paths still call seed-only queries.

The two systems share **domain types** in `packages/core/src/domain/types.ts`, imported as `@theosis/core` (`BibleVerse`, `CommentaryEntry`, `Person`, `Work`, `DailyCommemoration`, `WorkChapter`, etc.). UI consumes these shapes — never raw source text. The `@theosis/core` workspace package is platform-agnostic and is imported by **both** the Next.js backend in `src/` and the Expo mobile app in `apps/mobile/`. Mobile reaches the content via HTTP through `getApi()` (the typed `createTheosisApi` client from `@theosis/core/api/client`) — never imports server-only loaders directly.

### Verse and chapter IDs

Verse IDs are `{translationId}:{bookSlug}.{chapter}.{verse}` (e.g. `kjva:matthew.5.3`). Chapter IDs (for chapter-level commentary) are `{bookSlug}.{chapter}` — translation-agnostic. Helpers: `createVerseId`, `createChapterId`, `verseLocationKey` in `src/lib/content/reference.ts`.

Commentary is indexed against one translation (usually `kjva`) but `verseLocationKey()` strips the translation prefix so commentary still surfaces when the user reads a different translation. The normalize step keys per-verse files by `<bookSlug>.<chapter>.<verse>` already (translation-agnostic), and the loader and normalize script both import the same helper. Don't re-bind commentary to other translations — the location suffix is the canonical key.

### Calendar slice

`src/lib/calendar/` is its own subsystem with normalized data in `content/normalized/calendar/{menaion,movable-cycle,lectionary,hymns}.json`. Architecture:

- **Paschalion** (`paschalion.ts`) — Gauss algorithm, valid years 1900–2099. `resolvePaschalAnchor()` hands off to next year's Pascha once a date enters the next Triodion window, so Triodion readings resolve correctly across the year boundary.
- **Composers** (`composer.ts`, `readings.ts`, `hymns.ts`, `fasts.ts`) — pure functions: `(date, CalendarData, options) → DailyCommemoration | ReadingAssignment[] | HymnText[] | string`. The composer picks movable vs Menaion as primary; Menaion entries get promoted into `additionalCommemorations` when a movable feast outranks them.
- **Data loader** (`data.ts`) — server-only, caches the four JSON files once per process. Call `getDailyCommemoration(date, options)` etc. from server components.
- Default: New Calendar + Julian Pascha (OCA/GOARCH/Antiochian US English mainstream). The `jurisdiction` and `calendarSystem` axes exist in types but only New Calendar is wired.

### Mobile app architecture

`apps/mobile/` is expo-router 6 with file-based routes under `apps/mobile/app/`:

- `(tabs)/` — bottom tab shell. Four tabs: Daily (`index.tsx`), Bible (`explore.tsx`), Library (`library.tsx`), You (`you.tsx`). Search is reached from inside the Library tab; the "Home" surface from earlier plans was merged into Daily.
- Stack pushes: `reading/[work]/[order]`, `works/[slug]`, `people/[slug]`, `library/`, `topics/`, `guides/`, `parishes`, `parishes/[state]/[slug]`, `prayer`, `prayer-builder`, `diptych`, `settings`, `terms`, `privacy`, `auth`, `commentary-fathers`.
- Modals: `commentary/[book]/[chapter]/[verse]`, `book-picker`, `prayer-picker`, `saint-picker`.
- `onboarding/` — Phase 3 onboarding flow, gated by `OnboardingRedirect` in `app/_layout.tsx`.
- `note/[targetType]/[targetId]` — notes anchored to verse/chapter/work/person.

Mobile state and IO live under `apps/mobile/lib/`:
- `api.ts` — backend URL resolution + `getApi()` (typed `@theosis/core` client). Logs the resolved base URL once at startup; check this log when the backend appears wrong.
- `auth.ts` — Clerk token bridge that hands `getToken()` to the API client; wired in `app/_layout.tsx`'s `ClerkTokenBridge`.
- `preferences.ts` — AsyncStorage-backed local prefs + onboarding status.
- `sync/` — anonymous-id claim flow, hydrate on sign-in, offline write queue, profile sync.
- `prayer-corpus.ts`, `prayer-rule-pdf.ts`, `translation-info.ts`, `use-onboarding-state.ts`, `use-patron-icon.ts`.

Mobile uses **TanStack React Query** for server cache (provider in `app/_layout.tsx`) — not Zustand. Theme tokens live in `apps/mobile/constants/theosis-theme.ts`; reusable components under `apps/mobile/components/{theosis,ui,onboarding,…}`. Fonts are direct Newsreader weights bundled via `require(…)` of the specific `.ttf` files — see the comment in `app/_layout.tsx` before adding weights (each is ~50 KB).

### Web (backend) routing

The Next.js app under `src/app/` is mostly the API layer plus an older web reader. App Router with one route group `(shell)` wrapping Home/Daily/Bible/Library/Search/Profile under `AppShell` (`src/components/layout/app-shell.tsx` — bottom nav on mobile, side rail on desktop). `/` redirects to `/home`. Most pages are server components; `BibleReaderExperience`, `LibraryExplorer`, `SaintsBrowser`, and profile pickers are `"use client"`. Treat the web reader as a secondary surface — the mobile app is what ships.

### Client state

- **Mobile**: TanStack Query for remote data + AsyncStorage (`apps/mobile/lib/preferences.ts`) for local prefs/onboarding + SecureStore for Clerk tokens. No Zustand on mobile.
- **Web reader**: `src/lib/user/use-study-state.ts` is the only Zustand store. `persist` to `localStorage` keyed `theosis-study-state`, current `version: 1`. **When you add a required field to `ProfilePreferences` or `UserProfileSnapshot`, bump `version` and add a migration** — pre-existing local state rehydrates with `undefined` slots and crashes on first read (commit 8486a82 fixed exactly this).

### Search

`src/features/search/search-engine.ts` builds a fuse.js index over verses, commentary, people, works, topics, and daily entries — all at module load, in-process. `parseReferenceQuery()` runs first and short-circuits to a curated verse-result set when the query parses as a Scripture reference. Verse-reference results outrank fuzzy keyword matches. The verse axis is built from **seed** data (`bibleVerses` from `scripture.ts`), not the full normalized corpus, so verse coverage is intentionally narrow until phase 4. Mobile reaches search via the `/api/search` route through the typed client.

## Content pipeline

```
content/raw/        → content/generated/    → content/normalized/
(gitignored,         (gitignored,             (committed,
 source files —       big JSON per             per-chapter sliced
 PDF/XML/TXT)         translation or           files the app reads)
                      commentary bundle)
```

`content/raw/` and `content/generated/` are gitignored (see `.gitignore` — only directory READMEs/PROVENANCE files are committed under raw). Catena Aurea sources live in `corpus/catena_aurea_matthew/` instead of `content/raw/` — a separate acquisition workflow.

Adding a new Bible translation: write a parser in `scripts/ingest/parse-*.ts` returning `ParsedTranslationData`, add an entry to `TRANSLATIONS` and `JOBS` in `scripts/ingest/ingest.ts`, then `npm run ingest:bibles && npm run normalize:bibles:demo`. The app picks up new translations from `content/normalized/bibles/catalog.json` automatically.

Adding a new commentary source: write a parser in `scripts/ingest/commentary/parse-*.ts` returning a v2 `CommentaryBundle` (`{ version: "2", people, works, sources, entries, chapters? }`), wire it into `scripts/ingest/commentary/ingest-commentary.ts`, then `npm run ingest:commentary && npm run normalize:commentary`. The normalize step fans the generated bundle out into per-section files under `content/normalized/commentary/by-verse/`, `content/normalized/commentary/by-chapter/`, and `content/normalized/library/by-work/`, refreshes both `catalog.json` files, and the loader picks them up automatically. Long-form prose belongs in `chapters` (typed as `WorkChapter[]`) — slices into the library tree; verse-keyed snippets go in `entries` — slice into the commentary tree.

## Conventions worth knowing

- Server-only modules (`src/lib/bible/server-store.ts`, `src/lib/calendar/data.ts`, `src/lib/content/commentary-loader.ts`, the bible API route) start with `import "server-only";`. Don't import them from web client components, and **never** from anything under `apps/mobile/` — mobile must go through HTTP (`getApi()`).
- **Mobile is on Expo SDK 54.** APIs shift across SDKs; before writing Expo / Reanimated / expo-router code, read the versioned docs at https://docs.expo.dev/versions/v54.0.0/. This rule is loud enough that `apps/mobile/AGENTS.md` exists solely to repeat it.
- Saint long-form bios live in `src/lib/content/seed/saint-bios.ts` keyed by `person.id` and are merged onto `Person.extendedSummary` lazily by `attachBio()` in `queries.ts` — keep bios in that file, not in `library.ts`.
- Editorial-content policy (from `docs/calendar-strategy.md`): Theosis owns its prose. Use Wikidata (CC0) for facts and Hapgood (public domain) for hymns; **do not ingest CC-BY-SA prose** from OrthodoxWiki or the Prologue from Ohrid.
- Drizzle schema is shared (`packages/core/src/db/schema.ts`). Backend API routes import it; mobile never touches the DB directly — it goes through `/api/me/*` (completions, favorites, highlights, notes, prayer-rule, profile, reading-history, reading-list, recent-searches, saved-verses, activity-days, import).

## Git policy

- When the user asks you to commit, **also push** the resulting commits to `origin` on the same branch without asking — the default Claude Code "don't push autonomously" rule is overridden for this repo. Still ask first for destructive operations (force push, reset --hard, branch deletion).
- Never force-push to `master`. Other branches are fine if the user asks.
- Don't push commits the user didn't ask you to make. "Commit" implies push; "make this change" without "commit" does not.

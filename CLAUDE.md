# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Theosis is a mobile-first Orthodox Christian study app: verse-first patristic commentary, daily liturgical rhythm, library of Fathers, search. Next.js App Router + TypeScript strict. Path alias `@/*` → `./src/*`.

Product/architecture docs live in `docs/` (`product-plan.md`, `architecture.md`, `content-ingestion.md`, `mock-vs-real.md`, `calendar-strategy.md`). Read `.cursor/AGENTS.md` for the project's standing rules — the most important: never embed large text content in UI components, preserve provenance on every record, keep raw vs normalized content separate.

## Commands

```bash
npm run dev               # Next dev server (localhost)
npm run dev:mobile        # Next dev on 0.0.0.0 (for phone testing on LAN)
npm run build             # Production build
npm run lint              # eslint (next/core-web-vitals + next/typescript)

# Content pipeline (see "Content pipeline" below)
npm run ingest:bibles            # raw bible sources → content/generated/bibles/*.json
npm run normalize:bibles:demo    # content/generated/bibles → content/normalized/bibles/<id>/<book>/<chapter>.json
npm run ingest:commentary        # raw commentary corpora → content/generated/commentary/*.json

# Tests
npm run test:calendar     # Calendar unit tests — plain tsx script with assert(), no framework
```

There is no general test framework. `scripts/test/calendar.ts` runs assertions and exits non-zero on failure. To run a single calendar test, edit that file (or copy a block into a one-off `tsx` script) — it's not parameterized.

## Architecture

### Two parallel content systems

1. **Bible text** — files on disk. Authoritative store is `content/normalized/bibles/<translationId>/<bookSlug>/<chapterNumber>.json`. Read via `src/lib/bible/server-store.ts` (`getNormalizedChapter`, `getChapterVerses`, etc.) — server-only, with an in-process cache. The API route `/api/bible/[translation]/[book]/[chapter]` (in `src/app/api/bible/.../route.ts`) tries S3 first (`BIBLE_S3_BUCKET` / `BIBLE_S3_REGION`, default `theosis-content` / `us-east-1`) and falls back to the local normalized files.

2. **Library content** (people, works, commentary, sources, topics, daily) — seeded TypeScript in `src/lib/content/seed/{library,daily,profile,saint-bios,scripture}.ts`, queried via `src/lib/content/queries.ts` (`getPersonById`, `getDirectCommentaryForVerse`, etc.). On top of seed, `src/lib/content/commentary-loader.ts` **merges in** generated commentary bundles from `content/generated/commentary/*.json` (Catena Aurea Matthew/Mark/Luke/John, Augustine Confessions, Azkoul). The reader page (`src/app/(shell)/bible/[translation]/[book]/[chapter]/page.tsx`) uses this loader; older code paths still call seed-only queries.

The two systems share **domain types** in `src/domain/content/types.ts` (`BibleVerse`, `CommentaryEntry`, `Person`, `Work`, `DailyCommemoration`, `WorkChapter`, etc.). UI consumes these shapes — never raw source text.

### Verse and chapter IDs

Verse IDs are `{translationId}:{bookSlug}.{chapter}.{verse}` (e.g. `kjva:matthew.5.3`). Chapter IDs (for chapter-level commentary) are `{bookSlug}.{chapter}` — translation-agnostic. Helpers: `createVerseId`, `createChapterId` in `src/lib/content/reference.ts`.

Commentary is indexed against one translation (usually `kjva`) but the loader strips the translation prefix via `verseLocationKey()` so commentary still surfaces when the user reads a different translation. Don't re-bind commentary to other translations — the location suffix is the canonical key.

### Calendar slice

`src/lib/calendar/` is its own subsystem with normalized data in `content/normalized/calendar/{menaion,movable-cycle,lectionary,hymns}.json`. Architecture:

- **Paschalion** (`paschalion.ts`) — Gauss algorithm, valid years 1900–2099. `resolvePaschalAnchor()` hands off to next year's Pascha once a date enters the next Triodion window, so Triodion readings resolve correctly across the year boundary.
- **Composers** (`composer.ts`, `readings.ts`, `hymns.ts`, `fasts.ts`) — pure functions: `(date, CalendarData, options) → DailyCommemoration | ReadingAssignment[] | HymnText[] | string`. The composer picks movable vs Menaion as primary; Menaion entries get promoted into `additionalCommemorations` when a movable feast outranks them.
- **Data loader** (`data.ts`) — server-only, caches the four JSON files once per process. Call `getDailyCommemoration(date, options)` etc. from server components.
- Default: New Calendar + Julian Pascha (OCA/GOARCH/Antiochian US English mainstream). The `jurisdiction` and `calendarSystem` axes exist in types but only New Calendar is wired.

### Routing

App Router with one route group `(shell)` wrapping Daily/Bible/Library/Search/Profile under `AppShell` (`src/components/layout/app-shell.tsx` — bottom nav on mobile, side rail on desktop). `/` redirects to `/bible`. Most pages are server components; `BibleReaderExperience`, `LibraryExplorer`, `SaintsBrowser`, and profile pickers are `"use client"`.

### Client state

`src/lib/user/use-study-state.ts` is the only Zustand store. Uses `persist` with `localStorage`, keyed `theosis-study-state`, current `version: 1`. **When you add a required field to `ProfilePreferences` or `UserProfileSnapshot`, bump `version` and add a migration** — pre-existing local state will rehydrate with `undefined` slots and crash on first read (commit 8486a82 fixed exactly this).

### Search

`src/features/search/search-engine.ts` builds a fuse.js index over verses, commentary, people, works, topics, and daily entries — all at module load, in-process. `parseReferenceQuery()` runs first and short-circuits to a curated verse-result set when the query parses as a Scripture reference. Verse-reference results outrank fuzzy keyword matches. This index is built from **seed** data (`bibleVerses` from `scripture.ts`), not from the full normalized corpus, so search coverage is intentionally narrow until phase 4.

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

Adding a new commentary source: write a parser in `scripts/ingest/commentary/parse-*.ts` returning a v2 `CommentaryBundle` (`{ version: "2", people, works, sources, entries, chapters? }`), wire it into `scripts/ingest/commentary/ingest-commentary.ts`, then `npm run ingest:commentary`. The loader merges all bundles in `content/generated/commentary/` automatically. Long-form prose belongs in `chapters` (typed as `WorkChapter[]`); verse-keyed snippets go in `entries`.

## Conventions worth knowing

- Server-only modules (`src/lib/bible/server-store.ts`, `src/lib/calendar/data.ts`, `src/lib/content/commentary-loader.ts`, the bible API route) start with `import "server-only";`. Don't import them from client components.
- The commentary loader's repo-root discovery walks up three levels when run from `.claude/worktrees/<name>` — preserve that behavior if you refactor it.
- Saint long-form bios live in `src/lib/content/seed/saint-bios.ts` keyed by `person.id` and are merged onto `Person.extendedSummary` lazily by `attachBio()` in `queries.ts` — keep bios in that file, not in `library.ts`.
- Editorial-content policy (from `docs/calendar-strategy.md`): Theosis owns its prose. Use Wikidata (CC0) for facts and Hapgood (public domain) for hymns; **do not ingest CC-BY-SA prose** from OrthodoxWiki or the Prologue from Ohrid.

## Git policy

- When the user asks you to commit, **also push** the resulting commits to `origin` on the same branch without asking — the default Claude Code "don't push autonomously" rule is overridden for this repo. Still ask first for destructive operations (force push, reset --hard, branch deletion).
- Never force-push to `master`. Other branches are fine if the user asks.
- Don't push commits the user didn't ask you to make. "Commit" implies push; "make this change" without "commit" does not.

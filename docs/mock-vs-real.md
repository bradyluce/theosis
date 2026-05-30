# Mocked vs Real

> **⚠️ Outdated (as of 2026-05).** This document describes the early Phase 1/2
> prototype and materially understates what now ships. Authenticated user data
> is fully Drizzle/Neon-backed; the full Bible corpus and patristic library
> serve from R2 (with committed normalized fallbacks); the calendar has
> full-year Menaion/lectionary/hymn coverage. The one genuinely narrow area is
> the free-text **search verse index**, which is still seed-only (see
> `src/features/search/search-engine.ts`). Treat the sections below as
> historical, not current status.

## Phase 1 and 2

The app uses seeded content that is designed to resemble the final product:

- selected Scripture passages
- commentary excerpts
- saints and Fathers
- daily commemorations and readings
- related writings and library records
- local user-state examples

This content is mocked in coverage, not in structure. Each record should match the long-term model closely enough that feature code can survive the switch to normalized or database-backed content.

## Not real yet

- full Bible corpus
- full Orthodox calendar coverage
- production-grade search index
- authenticated user persistence
- automated source ingestion

## Real from day one

- route structure
- design system
- domain model boundaries
- search result categories
- provenance expectations for content
- ingestion folder layout
- future user-state contract

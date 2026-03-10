# Mocked vs Real

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

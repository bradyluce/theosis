# Content Ingestion

## Goal

Build a content pipeline that can absorb Orthodox source material gradually without forcing app rewrites.

## Content stages

### 1. Acquisition

Store source files and source metadata under `content/raw/` and `content/acquisition/`.

Supported source classes:

- structured text or JSON imports
- PDF source documents
- web pages and source collections

Every acquired source needs:

- source URL
- source collection name
- content category
- person or work attribution when known
- acquisition status
- parser strategy

### 2. Normalization

Normalization scripts in `scripts/ingest/` should convert raw inputs into stable internal records:

- normalized persons
- normalized works
- normalized commentary entries
- normalized daily records
- normalized verse-linked references

Normalized outputs belong in `content/normalized/` before they are promoted into app-consumable records or a database-backed pipeline.

### 3. App-facing records

The UI should consume a stable record shape that mirrors future database entities. This is why seeded mock data must already carry provenance and source attribution.

## PDF handling

PDFs are treated as acquisition sources, not as the primary reading experience. The pipeline should:

1. ingest the PDF and preserve its source link
2. extract readable text pages or sections
3. normalize headings, footnotes, page breaks, and metadata
4. map the text to persons, works, topics, or commentary targets

## Search indexing direction

The normalized layer should later emit indexable search documents for:

- verse commentary
- topic-related excerpts
- person and work metadata
- daily commemorations and readings

## Operational notes

- keep mocked data clearly marked as seeded
- avoid one-off parsers that bake assumptions into UI code
- prefer source adapters plus shared normalization helpers
- preserve provenance on every normalized record

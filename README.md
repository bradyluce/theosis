# Theosis

Theosis is a mobile-first Orthodox Christian web app for reading Scripture, studying patristic commentary, and following the daily liturgical rhythm.

## Product focus

The primary use case is verse-first patristic commentary:

- search a verse reference and route directly to the passage
- open direct commentary before merely related material
- preserve a quiet, premium, library-quality reading experience

The product is explicitly Eastern Orthodox, but it should feel broadly Orthodox rather than tied to a single jurisdiction.

## Phase 1 scope

This repository begins with the real app shell and content architecture, not a throwaway prototype:

- polished mobile-first navigation and layout
- Daily, Bible, Library, Search, and Profile sections
- seeded Orthodox-aware mock content
- Bible reader with verse interaction and commentary drawer
- search architecture that can later move from local mock indexing to a real content index
- ingestion planning and source-acquisition scaffolding

Authentication and cloud persistence are intentionally deferred. User state is scaffolded from the start, but the early product stays testable with local mock persistence.

## Chosen stack

- Next.js App Router with TypeScript
- Tailwind CSS v4 for tokens and utility composition
- `next/font` for typographic control and self-hosted font loading
- repository-owned UI primitives instead of a generic component kit
- seeded mock content in typed modules
- future-ready data layer planned for normalized PostgreSQL-compatible storage

## Repository structure

```text
docs/                  Product, architecture, and ingestion planning
content/
  acquisition/         Machine-readable source backlog and acquisition checklist
  mock/                Seed content used by the app in early phases
  raw/                 Future raw imports from PDF, web, and source files
  normalized/          Future normalized outputs for ingestion
scripts/
  ingest/              Parsers, importers, and text normalization utilities
src/
  app/                 Next.js routes and layout shell
  components/          UI primitives and layout components
  features/            Daily, Bible, Library, Search, and Profile feature code
  domain/              Content, search, and user-state types
  lib/                 Utilities, mock repositories, and helpers
  styles/              Design tokens and global UI foundations
```

## Planned phases

1. Repository setup, product docs, design system, shell, navigation, mock data, and polished scaffolds
2. Bible reader, verse interactions, commentary drawer, search UI, Library UI, and Daily UI
3. Real content schema, normalized storage design, source ingestion contracts, and search index design
4. Parser tooling, acquisition utilities, persistence, ranking improvements, and auth integration
5. Performance, bug fixes, polish, and deployment readiness

## Local development

```bash
npm install
npm run dev
```

## Documentation map

- `docs/product-plan.md`
- `docs/architecture.md`
- `docs/content-ingestion.md`
- `docs/mock-vs-real.md`
- `content/acquisition/checklist.json`

## Current content status

The initial app experience uses curated mock content designed to look and behave like the real product. Every seeded record should remain attributable and shaped like future normalized content so the UI does not need to be rewritten when real corpus ingestion begins.

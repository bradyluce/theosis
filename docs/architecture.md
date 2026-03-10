# Architecture

## Top-level approach

Theosis is a Next.js App Router application with a mobile-first shell, typed domain models, seeded local content, and a content pipeline designed to evolve toward normalized storage and indexed search.

## Route model

- `/daily`
- `/bible`
- `/bible/[translation]/[book]/[chapter]`
- `/library`
- `/library/people/[slug]`
- `/library/works/[slug]`
- `/search`
- `/profile`

The shell is shared across the five main sections with bottom navigation on small screens and a restrained side rail on larger screens.

## Source layout

```text
src/
  app/
    (shell)/
  components/
    layout/
    primitives/
    content/
  features/
    bible/
    daily/
    library/
    profile/
    search/
  domain/
    content/
    search/
    user/
  lib/
    content/
    search/
    utils/
  styles/
```

## Domain model

### Scripture

- `BibleTranslation`
- `BibleBook`
- `BibleChapter`
- `BibleVerse`
- `OriginalLanguageSegment`
- `CrossReference`

### Patristic and library content

- `Person`
- `Work`
- `WorkSection`
- `CommentaryEntry`
- `TopicTag`
- `SourceRecord`

Direct commentary and related writings are modeled separately so ranking and UI treatment remain distinct.

### Daily and liturgical content

- `DailyCommemoration`
- `FeastOrFast`
- `ReadingAssignment`
- `HymnText`

### User state

- `SavedVerse`
- `SavedHighlight`
- `SavedNote`
- `FavoritePerson`
- `SavedSearch`
- `ReadingHistoryEntry`
- `ProfilePreferences`

Phase 1 uses a local in-browser repository for these entities. Later phases can replace the implementation without changing feature-level contracts.

## Search architecture

Search will be layered from the beginning:

1. intent parsing for verse references and obvious canonical aliases
2. local fuzzy retrieval against seeded content
3. ranking rules that favor direct commentary over related writings
4. result shaping into verse, commentary, work, person, topic, and daily result types
5. snippet highlighting and smart routing

This shape should later map cleanly to a server-side search index without rewriting the page-level UI.

## Content pipeline direction

The repo separates:

- raw source acquisition
- normalized intermediate data
- typed app-facing content records

This keeps the app build moving while allowing gradual corpus expansion from Orthodox sources, parsed PDFs, and web sources.

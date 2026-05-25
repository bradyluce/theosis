# Commentary Normalize Step — Master Integration Plan

**Status:** Planning document — handoff for a fresh integration chat. Builds directly on the ~40 per-corpus `docs/*-raw-content-integration-plan.md` files and the existing Bible normalizer pattern.

**Date:** 2026-05-20
**Goal:** Convert ~100 monolithic JSON commentary bundles into committable per-section files, mirroring the Bible pipeline, so the content can deploy to iOS via Vercel / Capacitor / S3.

> **One-sentence summary for the integration chat:** Build `scripts/normalize/normalize-commentary.ts` to slice `content/generated/commentary/*.json` into per-verse and per-chapter files under `content/normalized/commentary/`, commit the output, and update `src/lib/content/commentary-loader.ts` to read from the new location with an S3 fallback mirroring `src/app/api/bible/[translation]/[book]/[chapter]/route.ts`.

---

## 1. Why this work exists

### 1.1 Current state of the pipeline

```
content/raw/                  →   scripts/ingest/commentary/  →   content/generated/commentary/   →   commentary-loader.ts   →   app
(gitignored, 1.2 GB              (65 parsers — committed)        (gitignored, 261 MB              (committed)
 source HTML/text/PDFs)                                          monolithic bundles)
```

- ✅ Raw acquisition: complete (Phase 1 + 2 + 3 + Phase-2 supplementary)
- ✅ Parsers: 65 of them committed to `scripts/ingest/commentary/parse-*.ts`
- ✅ Generated bundles: present locally, 105 files / 261 MB total
- ✅ Runtime loader: reads bundles and merges with seed via `commentary-loader.ts`
- ❌ **Missing:** the analogue of `content/normalized/bibles/` for commentary

### 1.2 Why this blocks iOS deployment

In dev mode (`npm run dev:mobile`), the laptop is the content server — files on disk feed the Next.js process. In production (Vercel / Capacitor / native iOS), the laptop disappears. Whatever content the phone sees must live in:

- **Git-tracked files** (Vercel reads the cloned repo)
- **The Capacitor build bundle** (.ipa includes static assets)
- **S3 / CDN** (the iOS app fetches at runtime)

`content/generated/commentary/` is in `.gitignore` and the bundles are too large to commit naively (largest is `chrysostom.json` at 26 MB; total 261 MB). The Bible pipeline already solved this by adding a normalize step that slices the generated output into per-chapter files (~10 KB each) under `content/normalized/bibles/` which IS committed. Commentary needs the same treatment.

### 1.3 The Bible pipeline (the reference pattern)

```
content/raw/bibles/             content/generated/bibles/            content/normalized/bibles/
(gitignored, 1.2 GB)            (gitignored, ~30 monolithic JSONs)   (COMMITTED, 83 MB, sliced)
PDFs/XMLs/TXTs   →   parse  →    ant1904.json (~50 MB each)   →    /ant1904/acts/1.json (~10 KB)
                                  brenton.json                       /ant1904/acts/2.json
                                  catalog.json                       ...
                                                                     /catalog.json
                                                                     ✓ shipped to iOS
```

The normalize script that performs the third arrow is `scripts/ingest/slice-generated-bibles.ts` (~70 lines). Read it first. The new commentary normalize script will be **structurally identical** with one key difference: commentary has two content shapes (verse-keyed `entries` and long-form `chapters`) rather than Bible's single shape (verse-keyed chapters).

---

## 2. Bundle inventory (input)

```
content/generated/commentary/         105 files, 261 MB total
```

| Category | Count | Sample sizes |
|---|---:|---|
| Catena Aurea (Matt/Mark/Luke/John) | 4 | 8–16 MB each |
| Augustine (~25 works) | 25 | 0.1–7.5 MB each |
| Chrysostom (monolithic) | 2 | 26 MB + 0.4 MB (adv.judaeos) |
| Major Greek Fathers (Basil, Gregorys, Athanasius, etc.) | ~15 | 0.5–4 MB each |
| Ante-Nicene (Tertullian, Origen, Cyprian, Justin, etc.) | ~20 | 0.2–7 MB each |
| Councils, liturgies, monastic, popes, historians, apocrypha | ~10 | 0.5–7 MB each |
| Apostolic Fathers + Greek Apologists | ~12 | 0.1–1 MB each |
| Phase-2-supplementary (acquired but parser not yet run) | ~8 | not yet generated |

### 2.1 v2 bundle shape

Every bundle uses `version: "2"` and has this top-level shape (from `src/lib/content/commentary-loader.ts` lines 30–39):

```ts
type CommentaryBundleV2 = {
  version: "2";
  people: Person[];
  works: Work[];
  sources: SourceRecord[];
  entries: CommentaryEntry[];     // verse-keyed snippets (Catena-Aurea style)
  chapters?: WorkChapter[];        // long-form prose (treatise/homily style)
};
```

The presence of `entries` vs `chapters` varies by bundle:

| Bundle | entries | chapters | Slicing strategy |
|---|---:|---:|---|
| `catena-aurea-luke` | 19,696 | 0 | Pure verse-keyed → slice by verse |
| `catena-aurea-matthew` | 19,551 | 0 | Same |
| `catena-aurea-john` | 13,703 | 0 | Same |
| `catena-aurea-mark` | 10,354 | 0 | Same |
| `augustine-tractates-john` | 954 | 124 | Both → slice both ways |
| `chrysostom` | 952 | 533 | Both |
| `azkoul` | 174 | 0 | Verse-keyed only |
| `augustine-psalms` | 150 | 150 | Both |
| `augustine-sermon-mount` | 111 | 2 | Mostly verse-keyed |
| `augustine-sermons-nt` | 98 | 97 | Both |
| `augustine-homilies-1john` | 89 | 10 | Mostly verse-keyed |
| `basil` | 32 | 335 | Mostly long-form |
| `cyril-jerusalem` | 11 | 24 | Mostly long-form |
| `augustine-confessions` | 0 | 13 | Pure long-form → slice by chapter |
| `dionysius-areopagite` | 0 | 5 | Pure long-form |
| `tertullian`, `tatian`, `theophilus`, `polycarp`, `roman-popes`, etc. | 0 | various | Pure long-form |

### 2.2 Entry shape (verse-keyed)

```ts
type CommentaryEntry = {
  id: string;                    // e.g. "catena-matt-0001"
  relation: "verse" | "chapter" | "topic";
  targetVerseId?: string;        // e.g. "kjva:matthew.1.1"
  targetChapterId?: string;
  topicSlugs: string[];
  personId: string;
  workId: string;
  title: string;
  excerpt: string;
  takeaway: string;
  sourceId: string;
  rank: number;
  tags: string[];
};
```

**Key fact:** `targetVerseId` is `<translationId>:<bookSlug>.<chapter>.<verse>` (e.g. `kjva:matthew.1.1`). The existing loader uses `verseLocationKey()` to strip the translation prefix so commentary surfaces across all translations. The normalized output should be keyed by `<bookSlug>.<chapter>.<verse>` (translation-agnostic).

### 2.3 Chapter shape (long-form)

```ts
type WorkChapter = {
  id: string;                    // e.g. "augustine-confessions-110101"
  workId: string;                // e.g. "augustine-confessions"
  order: number;
  label: string;                 // e.g. "Book I"
  title: string;                 // e.g. "The Confessions (Book I)"
  summary: string;
  sections: WorkSection[];
  sourceId: string;
};

type WorkSection = {
  heading: string;
  paragraphs: { text: string; ... }[];
};
```

Chapters contain inline `sections[].paragraphs[]` — the actual prose. A single Augustine Confessions book has ~18 sections; total payload per chapter is ~30–50 KB. Reasonable to ship as one file per chapter.

---

## 3. Output structure (what to build)

### 3.1 Proposed directory layout

```
content/normalized/commentary/
├── catalog.json                              # all Person + Work + Source records, one file
│
├── by-verse/                                 # for verse-keyed entries
│   └── <bookSlug>/
│       └── <chapter>/
│           └── <verse>.json                  # all entries targeting this verse
│   ├── matthew/
│   │   ├── 1/
│   │   │   ├── 1.json                        # ~30 catena entries on Matt 1:1
│   │   │   ├── 2.json
│   │   │   └── ...
│   │   ├── 5/
│   │   │   ├── 3.json                        # entries on Matt 5:3 (the first Beatitude)
│   │   │   └── ...
│   └── ...
│
└── by-work/                                  # for long-form chapters
    └── <workId>/
        └── <chapterOrder>.json               # one file per chapter/book/homily
    ├── augustine-confessions/
    │   ├── 1.json                            # Book I: 18 sections inline
    │   ├── 2.json                            # Book II
    │   └── ...
    ├── chrysostom-homilies-matthew/
    │   ├── 1.json                            # Homily 1
    │   ├── 2.json
    │   └── ...
    └── ...
```

### 3.2 File shape — `catalog.json`

```ts
{
  version: "1",
  people: Person[],          // deduped union of all bundles' people
  works: Work[],             // deduped union of all bundles' works
  sources: SourceRecord[],   // deduped union of all bundles' sources
  index: {
    byVerse: { [bookSlug]: { [chapter]: number[] } };  // verse numbers that have entries
    byWork:  { [workId]: { chapterCount: number; chapterIds: string[] } };
  }
}
```

The `index` lets the loader know what files exist without scanning the filesystem (important for S3 reads — listing a bucket is slow).

### 3.3 File shape — `by-verse/<bookSlug>/<chapter>/<verse>.json`

```ts
{
  bookSlug: string,
  chapterNumber: number,
  verseNumber: number,
  entries: CommentaryEntry[],   // all entries targeting this verse
}
```

### 3.4 File shape — `by-work/<workId>/<chapterOrder>.json`

```ts
{
  chapter: WorkChapter,         // full chapter with sections + paragraphs inline
}
```

### 3.5 Estimated output size

Working from per-bundle entry/chapter counts, the normalized output should be:

- **`by-verse/` files**: ~30,000 files at ~5–30 KB each → ~150–250 MB total
- **`by-work/` files**: ~3,000 files at ~20–80 KB each → ~80–150 MB total
- **`catalog.json`**: ~5–10 MB
- **Grand total**: ~250–400 MB committed to git

That's substantial but acceptable. Compare: the Bible normalized output is 83 MB. Commentary will be ~3× larger because it has both verse-keyed and long-form content. If git repo size becomes problematic, **Git LFS** is the standard answer for the largest files (the Catena Aurea verse files would be the biggest candidates).

---

## 4. The script — `scripts/normalize/normalize-commentary.ts`

### 4.1 Reference: read these first

Before writing anything, the integration chat should read:

1. **`scripts/ingest/slice-generated-bibles.ts`** (~70 lines) — the exact pattern to mirror
2. **`src/lib/content/commentary-loader.ts`** (~280 lines) — understand current load behavior, especially `verseLocationKey()` and the seed-merge pattern
3. **`src/app/api/bible/[translation]/[book]/[chapter]/route.ts`** (~60 lines) — the S3-first/local-fallback pattern that commentary should mirror
4. **`src/domain/content/types.ts`** — confirm the `Person`, `Work`, `SourceRecord`, `CommentaryEntry`, `WorkChapter`, `WorkSection` shapes

### 4.2 Algorithm

```ts
// pseudocode

const GENERATED_DIR = "content/generated/commentary";
const NORMALIZED_DIR = "content/normalized/commentary";

main():
  files = readdir(GENERATED_DIR).filter(endsWith(".json"))

  catalog = {
    version: "1",
    people: dedupedById([]),
    works: dedupedById([]),
    sources: dedupedById([]),
    index: { byVerse: {}, byWork: {} },
  }

  byVerseBuckets = Map<string, CommentaryEntry[]>()  // key: "<bookSlug>.<chapter>.<verse>"

  for fileName of files:
    bundle = readJson(GENERATED_DIR/fileName)
    skip if bundle.version !== "2"

    // Accumulate Person/Work/Source dedup
    catalog.people.merge(bundle.people)
    catalog.works.merge(bundle.works)
    catalog.sources.merge(bundle.sources)

    // Bucket verse-keyed entries
    for entry of bundle.entries:
      if entry.relation !== "verse" or !entry.targetVerseId: continue
      location = verseLocationKey(entry.targetVerseId)  // strips translation prefix
      // location = "<bookSlug>.<chapter>.<verse>"
      byVerseBuckets[location].push(entry)

    // Write each chapter to its own file
    if bundle.chapters:
      for chapter of bundle.chapters:
        path = NORMALIZED_DIR/by-work/{chapter.workId}/{chapter.order}.json
        writeJson(path, { chapter })
        catalog.index.byWork[chapter.workId] ||= { chapterCount: 0, chapterIds: [] }
        catalog.index.byWork[chapter.workId].chapterIds.push(chapter.id)
        catalog.index.byWork[chapter.workId].chapterCount++

  // Write verse files
  for [location, entries] of byVerseBuckets:
    [bookSlug, chapter, verse] = location.split(".")
    path = NORMALIZED_DIR/by-verse/{bookSlug}/{chapter}/{verse}.json
    writeJson(path, { bookSlug, chapterNumber: Number(chapter), verseNumber: Number(verse), entries })
    catalog.index.byVerse[bookSlug] ||= {}
    catalog.index.byVerse[bookSlug][chapter] ||= []
    catalog.index.byVerse[bookSlug][chapter].push(Number(verse))

  // Write catalog
  writeJson(NORMALIZED_DIR/catalog.json, catalog)
```

### 4.3 Helper to copy from `commentary-loader.ts`

The existing loader has a private helper that should be lifted into a shared module:

```ts
// Strip "<translationId>:" prefix from targetVerseId.
function verseLocationKey(targetVerseId: string): string {
  const colonIndex = targetVerseId.indexOf(":");
  return colonIndex === -1 ? targetVerseId : targetVerseId.slice(colonIndex + 1);
}
```

Suggested location: `src/lib/content/reference.ts` already has `createVerseId` and `createChapterId`. Add `verseLocationKey` there and import in both the normalizer and loader.

### 4.4 Dedup rules

- **People**: dedupe by `person.id`; first bundle wins (existing seed has priority via the loader, but for the catalog write all)
- **Works**: dedupe by `work.id`; first bundle wins
- **Sources**: dedupe by `source.id`; first bundle wins
- **Entries**: do NOT dedupe across bundles — the same verse can have entries from many fathers; bucket all of them together. Sort within a bucket by `entry.rank` descending (highest rank first).

### 4.5 Package.json wiring

Add to `package.json`:
```json
"normalize:commentary": "tsx scripts/normalize/normalize-commentary.ts",
```

Pattern note: the existing Bible normalizer is at `scripts/ingest/slice-generated-bibles.ts` (script lives under `scripts/ingest/`) with command `normalize:bibles:demo`. Either follow that path (`scripts/ingest/slice-generated-commentary.ts`) or create the new `scripts/normalize/` directory. The CLAUDE.md ASCII diagram shows the conceptual three-stage pipeline (`raw → generated → normalized`), so a new `scripts/normalize/` directory matching the third stage is reasonable. The integration chat should pick one and document the choice.

---

## 5. Loader update — `src/lib/content/commentary-loader.ts`

### 5.1 Current behavior (to preserve)

The current loader reads ALL bundles eagerly on first call, caches the result, and merges with seed. Six exported functions:

- `getChaptersForWork(workId)`
- `getPersonByIdFromAll(personId)`
- `getSourceByIdFromAll(sourceId)`
- `getGeneratedCommentary()`
- `getCommentaryEntriesForWork(workId)`
- `getWorkBySlugFromAll(slug)`
- `getAllPeopleFromAll()`
- `getAllWorksFromAll()`
- `getAllSourcesFromAll()`

The integration chat **must preserve these function signatures**. They are called from `src/app/(shell)/bible/[translation]/[book]/[chapter]/page.tsx` and elsewhere; breaking them breaks the app.

### 5.2 New behavior

Switch the loader to read from `content/normalized/commentary/` instead of `content/generated/commentary/`:

1. **On first call**: read `catalog.json` only. This gives all `people` / `works` / `sources` and the `index` for cheap. Cache it.
2. **For verse-keyed lookups**: load `by-verse/<bookSlug>/<chapter>/<verse>.json` lazily (per-verse) when needed. Cache loaded files.
3. **For work-keyed lookups**: load `by-work/<workId>/*.json` lazily when needed. Cache by `workId`.

This converts the loader from "eager full load" to "lazy per-file load." Memory footprint drops from 261 MB always-loaded to only the chapters/verses actively in use.

### 5.3 Reading function shape

```ts
function loadCatalog(): NormalizedCatalog | null { /* one read, cached */ }
function loadVerseEntries(bookSlug: string, chapter: number, verse: number): CommentaryEntry[] { /* cached per key */ }
function loadWorkChapter(workId: string, order: number): WorkChapter | null { /* cached per key */ }
function loadAllChaptersForWork(workId: string): WorkChapter[] { /* uses catalog.index then loads each */ }
```

The eight existing exports map onto these primitives.

---

## 6. S3 mirror — runtime fetch from `theosis-content`

### 6.1 Goal

In production, Vercel + iOS app should fetch commentary files from S3 first, falling back to bundled-local files only if S3 fails. This matches the Bible pattern (already implemented in `src/app/api/bible/[translation]/[book]/[chapter]/route.ts`).

### 6.2 Two new API routes

Create:

```
src/app/api/commentary/by-verse/[book]/[chapter]/[verse]/route.ts
src/app/api/commentary/by-work/[work]/[order]/route.ts
```

Each follows the Bible route's structure:

```ts
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const REGION = process.env.BIBLE_S3_REGION ?? "us-east-1";
const BUCKET = process.env.BIBLE_S3_BUCKET ?? "theosis-content";

async function getFromS3(key: string): Promise<unknown | null> {
  try {
    const result = await s3Client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const body = await result.Body?.transformToString("utf-8");
    return body ? JSON.parse(body) : null;
  } catch {
    return null;
  }
}

export async function GET(_request, context) {
  const { book, chapter, verse } = await context.params;
  const key = `commentary/by-verse/${book}/${chapter}/${verse}.json`;
  const fromS3 = await getFromS3(key);
  const fallback = fromS3 ?? loadVerseEntries(book, Number(chapter), Number(verse));
  if (!fallback) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(fallback);
}
```

### 6.3 S3 push step (separate, after normalize)

Add a one-time-per-deploy script:

```json
"push:commentary:s3": "tsx scripts/push/push-commentary-to-s3.ts"
```

Push the entire `content/normalized/commentary/` directory to the `theosis-content` bucket under prefix `commentary/`. Use `aws s3 sync` semantics — only upload changed files.

This is **optional for v1**: the Vercel deployment can read the committed files directly via the loader. S3 push becomes valuable for:
- CDN caching at scale (Vercel's edge network)
- Updates without redeploying (push new commentary → live in seconds)
- Capacitor / native iOS apps that prefer HTTP fetch over bundled JSON

### 6.4 Environment variables

Already present per the auth plan:
- `BIBLE_S3_BUCKET=theosis-content`
- `BIBLE_S3_REGION=us-east-1`

For consistency, the commentary routes use the SAME bucket (just under a different prefix: `commentary/` vs `bibles/`). No new env vars needed.

---

## 7. gitignore changes

Current `.gitignore`:
```
/content/generated/
/content/raw/**
!/content/raw/**/
!/content/raw/**/README.md
!/content/raw/**/PROVENANCE.json
!/content/raw/.gitkeep
```

**No changes needed**: `/content/normalized/` is not in `.gitignore`, so the new commentary normalized files will be committed automatically once written. (`content/normalized/bibles/` is already committed under this rule.)

If commentary files become too large for git (>500 MB total), consider:

1. **Git LFS** for the largest verse-bucket files (Catena Aurea verse files in Matthew, Mark, Luke, John)
2. **Skip committing** `content/normalized/commentary/` and rely exclusively on S3 (riskier for cold-start deploys)
3. **Compress** with gzip per file — git stores them as-is and the loader decompresses

LFS is the standard answer. The integration chat should check final size after running once and decide.

---

## 8. Verification — how to confirm nothing broke

### 8.1 Pre-flight (BEFORE running the normalize script)

Take note of current behavior so you can check the after state:

```bash
# Count commentary entries surfaced in the reader for one specific verse
curl -s http://localhost:3000/bible/kjva/matthew/5 | grep -c "commentary-entry"
# Sample value: ~30
```

Pick 3 representative pages and record their counts. After the normalize step, the counts should match.

### 8.2 During normalization

The script should print:
- Number of bundles read
- Number of `by-verse` files written
- Number of `by-work` files written
- Total output size on disk
- People / Works / Sources count in catalog

Sanity-check against expected: ~30,000 verse files, ~3,000 work files, ~250–400 MB total.

### 8.3 After running

```bash
# 1. The catalog should have all known fathers
node -e "const c = require('./content/normalized/commentary/catalog.json'); console.log('people:', c.people.length, 'works:', c.works.length);"
# Expected: people > 40, works > 300

# 2. Sample verse file exists and has entries
cat content/normalized/commentary/by-verse/matthew/5/3.json | head -20
# Expected: ~20-40 entries

# 3. Sample work file exists and has chapter
cat content/normalized/commentary/by-work/augustine-confessions/1.json | head -20
# Expected: chapter object with sections array

# 4. App still renders the same content
npm run dev
# Open http://localhost:3000/bible/kjva/matthew/5 — verify Beatitudes commentary is present
```

### 8.4 Regression test — `npm run test:calendar`

This is the only existing test. It should still pass:
```bash
npm run test:calendar
```

### 8.5 Build still works

```bash
npm run lint
npm run build
```

---

## 9. Phased rollout

The work is naturally phased so each phase can land independently:

### Phase 1 — Write & run the normalizer (no app code changes)

1. Write `scripts/normalize/normalize-commentary.ts` (or `scripts/ingest/slice-generated-commentary.ts` to match Bible naming)
2. Run it: produces `content/normalized/commentary/` directory
3. Manually inspect output for shape correctness
4. **No code in `src/` changes yet** — the app still reads from `content/generated/commentary/`
5. Commit the new normalized files + the script

### Phase 2 — Switch the loader

1. Modify `src/lib/content/commentary-loader.ts` to read from `content/normalized/commentary/` instead of `content/generated/commentary/`
2. Preserve all 8 exported function signatures
3. Add lazy-loading per-verse and per-work helpers
4. Run `npm run dev`, verify pages render unchanged
5. Commit

### Phase 3 — Add S3 API routes (optional)

1. Create `src/app/api/commentary/by-verse/[book]/[chapter]/[verse]/route.ts`
2. Create `src/app/api/commentary/by-work/[work]/[order]/route.ts`
3. Mirror the Bible route's S3-first/local-fallback pattern
4. Loader can optionally call these routes for client-side fetches (but server-side rendering can keep reading files directly)
5. Commit

### Phase 4 — S3 push (optional)

1. Write `scripts/push/push-commentary-to-s3.ts` using `@aws-sdk/client-s3` (already a dep)
2. Add `npm run push:commentary:s3` to package.json
3. Run once to populate the bucket
4. Wire into CI/CD: push on every commit to `main`

### Phase 5 — Generate the missing Phase-2-supplementary bundles

Eight Phase-2-supplementary acquisitions have raw content but no generated bundle yet (because parsers haven't been wired):

| Bundle target | Source raw location | Integration plan doc |
|---|---|---|
| `irenaeus-demonstration.json` | `content/raw/fathers/irenaeus/demonstration/` | `docs/irenaeus-demonstration-raw-content-integration-plan.md` |
| `john-damascus-divine-images.json` | `content/raw/fathers/john-damascus/divine-images/` | `docs/john-damascus-divine-images-raw-content-integration-plan.md` |
| `hapgood-service-book.json` | `content/raw/liturgy/hapgood-service-book/` | `docs/hapgood-service-book-raw-content-integration-plan.md` |
| `chrysostom-adversus-judaeos.json` | `content/raw/fathers/chrysostom/adversus-judaeos/` | `docs/chrysostom-adversus-judaeos-raw-content-integration-plan.md` |
| `dionysius-areopagite.json` | `content/raw/fathers/dionysius-areopagite/` | `docs/dionysius-areopagite-raw-content-integration-plan.md` |
| `macarius-egyptian.json` | `content/raw/fathers/macarius-egyptian/` | `docs/macarius-egyptian-raw-content-integration-plan.md` |
| `desert-fathers-paradise.json` | `content/raw/fathers/desert-fathers/` | `docs/desert-fathers-paradise-raw-content-integration-plan.md` |
| `evagrius-praktikos.json` | `content/raw/fathers/evagrius-ponticus/` | `docs/evagrius-praktikos-raw-content-integration-plan.md` |

Some of these may already exist (check `ls content/generated/commentary/`); others need new parsers in `scripts/ingest/commentary/parse-*.ts`. The per-corpus integration plans describe each source's structure in detail.

After parsers are added, re-run the full pipeline: `npm run ingest:commentary && npm run normalize:commentary && git add content/normalized/commentary/ && git commit`.

---

## 10. Risks & gotchas

### 10.1 Repo size

~250–400 MB committed is large but manageable. Git operations (clone, fetch) will be slower. If a teammate reports clone problems, switch the biggest verse-bucket files to LFS.

### 10.2 First-render cold cache

Lazy-loading means the FIRST page view that needs Catena Aurea on Matthew 5 reads ~5–30 KB from disk per verse. With ~30 entries per verse this is fast (one read), but the Next.js process must read for each visited verse. Cache aggressively.

### 10.3 Cache invalidation

The loader's module-level cache persists for the lifetime of the Node process. If commentary is regenerated and re-normalized, the dev server must be restarted to pick up changes. This matches the current behavior — no regression.

### 10.4 Filename collisions

`by-verse/<bookSlug>/<chapter>/<verse>.json` has stable, deterministic filenames. No collisions expected.

`by-work/<workId>/<chapterOrder>.json` uses `order` (an integer) for the filename, not `chapter.id`. If two chapters in the same work share an order (which would be a parser bug), one will overwrite the other. The normalize script should detect and warn on this.

### 10.5 LXX vs MT psalm numbering

The loader currently uses `toEntryChapterNumbers` from `psalter-numbering.ts` to remap LXX-numbered commentary to MT-numbered Bible verses (or vice versa per translation). The normalize step should preserve LXX numbering in `entry.targetVerseId` as written by parsers — DON'T normalize at slice time. The runtime loader can still apply the LXX/MT remap on lookup.

This means a single entry tagged for `psalms.50.10` (LXX) lives in `by-verse/psalms/50/10.json` and the loader translates the URL `bible/kjva/psalms/51` (MT) → look up LXX 50 → find this file. Don't pre-translate during normalization.

### 10.6 Bundle version skew

Currently all bundles are v2. If a parser is added later that produces v1, the normalize script must support v1's shape too:

```ts
type CommentaryBundleV1 = {
  version: "1";
  person: Person;           // singular
  work: Work;
  source: SourceRecord;
  entries: CommentaryEntry[];
  // NO chapters
};
```

Trivial to handle: just normalize singular → array.

### 10.7 Empty `chapters` arrays

Some bundles have `chapters: []` literally. Skip the by-work write for these.

### 10.8 Seed-merge order in the new loader

The current loader merges seed (`src/lib/content/seed/library.ts`) with generated bundles. Seed wins on conflict for some merges. The new loader should preserve this — seed people/works/sources are still authoritative.

### 10.9 Commentary entries also live in the seed

`seedCommentary` from `src/lib/content/seed/library.ts` has hand-written verse entries. These are separate from generated bundles and must continue to flow through the loader. Don't try to merge them into `catalog.json` — keep the dual-path: seed + normalized files.

### 10.10 The Catena Aurea de-dup pass

`getCommentaryEntriesForWork()` currently dedupes Catena Aurea range entries by `id.replace(/-v\d+$/, "")` so the same comment doesn't appear once per verse in the range. This is a render-time concern — the slice should write the entry to EVERY verse file in the range (so a verse-page view finds it), but the work-view should keep the existing dedupe logic.

---

## 11. Definition of done

Phase 1 + 2 are the **minimum viable normalize step**. Phases 3 + 4 + 5 are deployment polish.

**Phase 1 + 2 are done when:**

1. ✅ `scripts/normalize/normalize-commentary.ts` exists, is documented, and runs idempotently
2. ✅ `package.json` has `normalize:commentary` script
3. ✅ `content/normalized/commentary/catalog.json` exists with all people/works/sources/index
4. ✅ `content/normalized/commentary/by-verse/<bookSlug>/<chapter>/<verse>.json` files written for every verse-keyed entry
5. ✅ `content/normalized/commentary/by-work/<workId>/<order>.json` files written for every chapter
6. ✅ `src/lib/content/commentary-loader.ts` reads from `content/normalized/commentary/` (lazy per-file)
7. ✅ All 8 existing loader exports preserved with same signatures
8. ✅ `npm run dev` renders Bible reader pages with full commentary as before
9. ✅ `npm run lint` and `npm run build` pass
10. ✅ `npm run test:calendar` passes
11. ✅ Manual smoke test: open 3 pages (Matt 5, Augustine Confessions Book 1, Genesis 1) and verify content density unchanged
12. ✅ `content/normalized/commentary/` is committed to git (verify with `git ls-files content/normalized/commentary/ | wc -l` → should be ~30,000+ files)

**Phase 3 + 4 are done when:**

- API routes exist and return correct data
- `npm run push:commentary:s3` works and S3 bucket has the files
- Bible-style S3-first/local-fallback works in production environment

**Phase 5 is done when:**

- All 8 Phase-2-supplementary acquisitions have generated bundles in `content/generated/commentary/`
- They appear in normalized output after re-running normalize

---

## 12. Appendix — Reference file paths

### 12.1 Read first
- `scripts/ingest/slice-generated-bibles.ts` — the Bible normalizer (70 lines)
- `src/lib/content/commentary-loader.ts` — the current loader (280 lines)
- `src/app/api/bible/[translation]/[book]/[chapter]/route.ts` — the S3-first pattern (60 lines)
- `src/domain/content/types.ts` — domain shapes
- `CLAUDE.md` — project conventions

### 12.2 Per-corpus integration plans (input context)
- `docs/augustine-raw-content-integration-plan.md`
- `docs/gregory-of-nyssa-raw-content-integration-plan.md`
- `docs/athanasius-raw-content-integration-plan.md`
- `docs/basil-raw-content-integration-plan.md`
- `docs/chrysostom-raw-content-integration-plan.md`
- `docs/gregory-nazianzen-raw-content-integration-plan.md`
- `docs/ignatius-raw-content-integration-plan.md`
- `docs/irenaeus-raw-content-integration-plan.md`
- `docs/cyril-jerusalem-raw-content-integration-plan.md`
- `docs/john-damascus-raw-content-integration-plan.md`
- `docs/ephraim-syrian-raw-content-integration-plan.md`
- `docs/aphrahat-raw-content-integration-plan.md`
- `docs/jerome-raw-content-integration-plan.md`
- `docs/ambrose-raw-content-integration-plan.md`
- `docs/ecumenical-councils-raw-content-integration-plan.md`
- `docs/local-councils-raw-content-integration-plan.md`
- `docs/early-liturgies-raw-content-integration-plan.md`
- `docs/church-historians-raw-content-integration-plan.md`
- `docs/monastic-tradition-raw-content-integration-plan.md`
- `docs/roman-popes-raw-content-integration-plan.md`
- `docs/other-western-witnesses-raw-content-integration-plan.md`
- `docs/irenaeus-demonstration-raw-content-integration-plan.md` (Phase-2-supp)
- `docs/john-damascus-divine-images-raw-content-integration-plan.md` (Phase-2-supp)
- `docs/hapgood-service-book-raw-content-integration-plan.md` (Phase-2-supp)
- `docs/chrysostom-adversus-judaeos-raw-content-integration-plan.md` (Phase-2-supp)
- `docs/dionysius-areopagite-raw-content-integration-plan.md` (Phase-2-supp)
- `docs/macarius-egyptian-raw-content-integration-plan.md` (Phase-2-supp)
- `docs/desert-fathers-paradise-raw-content-integration-plan.md` (Phase-2-supp)
- `docs/evagrius-praktikos-raw-content-integration-plan.md` (Phase-2-supp)
- `docs/tier-3-deferred-acquisitions.md`

### 12.3 Files this work modifies/creates
- **Create** `scripts/normalize/normalize-commentary.ts` (~150 lines)
- **Create** `src/app/api/commentary/by-verse/[book]/[chapter]/[verse]/route.ts` (~60 lines, optional)
- **Create** `src/app/api/commentary/by-work/[work]/[order]/route.ts` (~60 lines, optional)
- **Create** `scripts/push/push-commentary-to-s3.ts` (~100 lines, optional)
- **Modify** `src/lib/content/commentary-loader.ts` (replace eager-load with lazy-load)
- **Modify** `src/lib/content/reference.ts` (export `verseLocationKey`)
- **Modify** `package.json` (add 1–3 new scripts)
- **Create** ~30,000 normalized JSON files under `content/normalized/commentary/`

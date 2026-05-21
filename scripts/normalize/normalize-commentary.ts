// Slice content/generated/commentary/*.json into two parallel committable
// trees, mirroring scripts/ingest/slice-generated-bibles.ts for the commentary
// + library side of the pipeline. Splitting "commentary" (verse-keyed snippets)
// from "library" (full readable WorkChapter prose) makes the directory layout
// honest about what each artifact is and matches the self-contained pattern
// used by bibles/, icons/, and calendar/ under content/normalized/.
//
// Output:
//   content/normalized/commentary/
//   ├── catalog.json                                # people/works/sources + index { byVerse, byChapter }
//   ├── by-verse/<bookSlug>/<chapter>/<verse>.json  # verse-keyed entries
//   └── by-chapter/<bookSlug>/<chapter>.json        # chapter-level entries
//
//   content/normalized/library/
//   ├── catalog.json                                # people/works/sources + index { byWork }
//   └── by-work/<workId>/<order>.json               # long-form WorkChapter prose
//
// Each catalog carries the full people/works/sources arrays — duplication is
// intentional so each consumer (verse reader vs library reader) reads only its
// own catalog. Loader implication for Phase 2: the verse reader pulls only
// commentary/by-verse/... + commentary/by-chapter/...; it never auto-loads
// library/by-work/<workId>/... for an entry that references a work. Entries
// carry workId so the UI links to the work view, which then loads from the
// library tree on demand.
//
// Idempotent: re-running overwrites every output file. The script does NOT
// prune stale files left over from deleted bundles — if a bundle disappears,
// `git status` will show the orphaned files and they can be removed by hand.

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import type {
  CommentaryEntry,
  Person,
  SourceRecord,
  Work,
  WorkChapter,
} from "../../src/domain/content/types";
import { verseLocationKey } from "../../src/lib/content/reference";

type CommentaryBundleV1 = {
  version: "1";
  person: Person;
  work: Work;
  source: SourceRecord;
  entries: CommentaryEntry[];
};

type CommentaryBundleV2 = {
  version: "2";
  people: Person[];
  works: Work[];
  sources: SourceRecord[];
  entries: CommentaryEntry[];
  chapters?: WorkChapter[];
};

type CommentaryBundle = CommentaryBundleV1 | CommentaryBundleV2;

type CommentaryCatalog = {
  version: "1";
  people: Person[];
  works: Work[];
  sources: SourceRecord[];
  index: {
    byVerse: Record<string, Record<string, number[]>>;
    byChapter: Record<string, number[]>;
  };
};

type LibraryCatalog = {
  version: "1";
  people: Person[];
  works: Work[];
  sources: SourceRecord[];
  index: {
    // `chapterIds` and `orders` are parallel arrays, both sorted ascending by
    // order. `orders` is what the loader needs to find files (filenames use
    // <order>.json); orders aren't always 1..N — the ecumenical-council
    // works pin their single chapter at the council's traditional ordinal
    // (e.g. Chalcedon at order=4) which leaves gaps.
    byWork: Record<
      string,
      { chapterCount: number; chapterIds: string[]; orders: number[] }
    >;
  };
};

type ByVerseFile = {
  bookSlug: string;
  chapterNumber: number;
  verseNumber: number;
  entries: CommentaryEntry[];
};

type ByChapterFile = {
  bookSlug: string;
  chapterNumber: number;
  entries: CommentaryEntry[];
};

type ByWorkFile = {
  chapter: WorkChapter;
};

const ROOT = process.cwd();
const GENERATED_DIR = join(ROOT, "content", "generated", "commentary");
const COMMENTARY_DIR = join(ROOT, "content", "normalized", "commentary");
const LIBRARY_DIR = join(ROOT, "content", "normalized", "library");

function readJsonFile<T>(absolutePath: string): T {
  return JSON.parse(readFileSync(absolutePath, "utf8")) as T;
}

function writeJsonFile(absolutePath: string, value: unknown) {
  mkdirSync(join(absolutePath, ".."), { recursive: true });
  writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

type NormalizedBundle = {
  people: Person[];
  works: Work[];
  sources: SourceRecord[];
  entries: CommentaryEntry[];
  chapters: WorkChapter[];
};

function normalizeBundle(bundle: CommentaryBundle): NormalizedBundle {
  if (bundle.version === "1") {
    return {
      people: [bundle.person],
      works: [bundle.work],
      sources: [bundle.source],
      entries: bundle.entries,
      chapters: [],
    };
  }
  return {
    people: bundle.people,
    works: bundle.works,
    sources: bundle.sources,
    entries: bundle.entries,
    chapters: bundle.chapters ?? [],
  };
}

function main() {
  if (!existsSync(GENERATED_DIR)) {
    console.error(
      `[normalize-commentary] ${GENERATED_DIR} does not exist; run "npm run ingest:commentary" first.`,
    );
    process.exit(1);
  }

  const files = readdirSync(GENERATED_DIR).filter((name) => name.endsWith(".json"));
  if (files.length === 0) {
    console.error(`[normalize-commentary] no bundles found in ${GENERATED_DIR}`);
    process.exit(1);
  }

  const peopleById = new Map<string, Person>();
  const worksById = new Map<string, Work>();
  const sourcesById = new Map<string, SourceRecord>();

  // "<bookSlug>.<chapter>.<verse>" → entries
  const byVerseBuckets = new Map<string, CommentaryEntry[]>();
  // "<bookSlug>.<chapter>" → entries
  const byChapterBuckets = new Map<string, CommentaryEntry[]>();
  // workId → order → WorkChapter (Map lets us detect collisions across bundles)
  const chaptersByWork = new Map<string, Map<number, WorkChapter>>();

  let bundlesRead = 0;
  let entriesRead = 0;
  let chaptersRead = 0;
  let entriesSkipped = 0;

  for (const fileName of files) {
    let bundle: CommentaryBundle;
    try {
      bundle = readJsonFile<CommentaryBundle>(join(GENERATED_DIR, fileName));
    } catch (error) {
      console.warn(`[normalize-commentary] failed to read ${fileName}:`, error);
      continue;
    }
    bundlesRead++;

    const normalized = normalizeBundle(bundle);

    // Catalog dedupe: first occurrence wins. Matches the existing loader's
    // merge behavior (see commentary-loader.ts getAllPeopleFromAll, etc.).
    for (const person of normalized.people) {
      if (!peopleById.has(person.id)) peopleById.set(person.id, person);
    }
    for (const work of normalized.works) {
      if (!worksById.has(work.id)) worksById.set(work.id, work);
    }
    for (const source of normalized.sources) {
      if (!sourcesById.has(source.id)) sourcesById.set(source.id, source);
    }

    for (const entry of normalized.entries) {
      entriesRead++;

      // Verse-keyed: any entry carrying a targetVerseId surfaces in the verse
      // reader, regardless of relation. Catena uses "verse"; the legacy Azkoul
      // v1 bundle uses "related-topic" — both must be sliced.
      if (entry.targetVerseId) {
        const location = verseLocationKey(entry.targetVerseId);
        const list = byVerseBuckets.get(location);
        if (list) list.push(entry);
        else byVerseBuckets.set(location, [entry]);
        continue;
      }

      // Chapter-level: relation "chapter" with a targetChapterId. The reader
      // pulls these via loadChapterCommentary's chapterLevel bucket.
      if (entry.relation === "chapter" && entry.targetChapterId) {
        const list = byChapterBuckets.get(entry.targetChapterId);
        if (list) list.push(entry);
        else byChapterBuckets.set(entry.targetChapterId, [entry]);
        continue;
      }

      // Topic-only entries (no targetVerseId, no targetChapterId) are not
      // surfaced by the verse/chapter reader. Skip but count for visibility.
      entriesSkipped++;
    }

    for (const chapter of normalized.chapters) {
      chaptersRead++;
      let inner = chaptersByWork.get(chapter.workId);
      if (!inner) {
        inner = new Map<number, WorkChapter>();
        chaptersByWork.set(chapter.workId, inner);
      }
      const existing = inner.get(chapter.order);
      if (existing && existing.id !== chapter.id) {
        // Two parsers wrote a chapter at the same (workId, order). Keep the
        // first; warn so the conflict surfaces in CI/local output.
        console.warn(
          `[normalize-commentary] chapter-order collision in ${chapter.workId} order=${chapter.order}: keeping ${existing.id}, dropping ${chapter.id} (from ${fileName})`,
        );
        continue;
      }
      inner.set(chapter.order, chapter);
    }
  }

  // Write commentary/by-verse files. Sort entries within a bucket by rank desc
  // to match the loader's loadChapterCommentary post-sort.
  const byVerseIndex: Record<string, Record<string, number[]>> = {};
  let verseFilesWritten = 0;
  for (const [location, entries] of byVerseBuckets) {
    const [bookSlug, chapterStr, verseStr] = location.split(".");
    const chapterNumber = Number.parseInt(chapterStr ?? "", 10);
    const verseNumber = Number.parseInt(verseStr ?? "", 10);
    if (!bookSlug || Number.isNaN(chapterNumber) || Number.isNaN(verseNumber)) {
      console.warn(
        `[normalize-commentary] skipping verse bucket with malformed location "${location}"`,
      );
      continue;
    }

    entries.sort((a, b) => b.rank - a.rank);

    const filePath = join(
      COMMENTARY_DIR,
      "by-verse",
      bookSlug,
      String(chapterNumber),
      `${verseNumber}.json`,
    );
    const file: ByVerseFile = { bookSlug, chapterNumber, verseNumber, entries };
    writeJsonFile(filePath, file);
    verseFilesWritten++;

    byVerseIndex[bookSlug] ??= {};
    byVerseIndex[bookSlug][String(chapterNumber)] ??= [];
    byVerseIndex[bookSlug][String(chapterNumber)].push(verseNumber);
  }
  for (const chapters of Object.values(byVerseIndex)) {
    for (const verses of Object.values(chapters)) {
      verses.sort((a, b) => a - b);
    }
  }

  // Write commentary/by-chapter files.
  const byChapterIndex: Record<string, number[]> = {};
  let chapterFilesWritten = 0;
  for (const [location, entries] of byChapterBuckets) {
    const [bookSlug, chapterStr] = location.split(".");
    const chapterNumber = Number.parseInt(chapterStr ?? "", 10);
    if (!bookSlug || Number.isNaN(chapterNumber)) {
      console.warn(
        `[normalize-commentary] skipping chapter bucket with malformed location "${location}"`,
      );
      continue;
    }

    entries.sort((a, b) => b.rank - a.rank);

    const filePath = join(COMMENTARY_DIR, "by-chapter", bookSlug, `${chapterNumber}.json`);
    const file: ByChapterFile = { bookSlug, chapterNumber, entries };
    writeJsonFile(filePath, file);
    chapterFilesWritten++;

    byChapterIndex[bookSlug] ??= [];
    byChapterIndex[bookSlug].push(chapterNumber);
  }
  for (const chapters of Object.values(byChapterIndex)) {
    chapters.sort((a, b) => a - b);
  }

  // Write library/by-work files.
  const byWorkIndex: Record<
    string,
    { chapterCount: number; chapterIds: string[]; orders: number[] }
  > = {};
  let workFilesWritten = 0;
  for (const [workId, byOrder] of chaptersByWork) {
    const ordered = [...byOrder.values()].sort((a, b) => a.order - b.order);
    if (ordered.length === 0) continue;
    for (const chapter of ordered) {
      const filePath = join(LIBRARY_DIR, "by-work", workId, `${chapter.order}.json`);
      const file: ByWorkFile = { chapter };
      writeJsonFile(filePath, file);
      workFilesWritten++;
    }
    byWorkIndex[workId] = {
      chapterCount: ordered.length,
      chapterIds: ordered.map((c) => c.id),
      orders: ordered.map((c) => c.order),
    };
  }

  // Sort catalog arrays by id for stable diffs across re-runs.
  const peopleSorted = [...peopleById.values()].sort((a, b) => a.id.localeCompare(b.id));
  const worksSorted = [...worksById.values()].sort((a, b) => a.id.localeCompare(b.id));
  const sourcesSorted = [...sourcesById.values()].sort((a, b) => a.id.localeCompare(b.id));

  const commentaryCatalog: CommentaryCatalog = {
    version: "1",
    people: peopleSorted,
    works: worksSorted,
    sources: sourcesSorted,
    index: {
      byVerse: byVerseIndex,
      byChapter: byChapterIndex,
    },
  };
  writeJsonFile(join(COMMENTARY_DIR, "catalog.json"), commentaryCatalog);

  const libraryCatalog: LibraryCatalog = {
    version: "1",
    people: peopleSorted,
    works: worksSorted,
    sources: sourcesSorted,
    index: {
      byWork: byWorkIndex,
    },
  };
  writeJsonFile(join(LIBRARY_DIR, "catalog.json"), libraryCatalog);

  console.log(`[normalize-commentary] bundles read:            ${bundlesRead}`);
  console.log(`[normalize-commentary] entries read:            ${entriesRead}`);
  console.log(`[normalize-commentary]   skipped (no target):   ${entriesSkipped}`);
  console.log(`[normalize-commentary] long-form chapters read: ${chaptersRead}`);
  console.log(
    `[normalize-commentary] catalog: ${peopleSorted.length} people, ${worksSorted.length} works, ${sourcesSorted.length} sources`,
  );
  console.log(`[normalize-commentary] commentary/by-verse:   ${verseFilesWritten}`);
  console.log(`[normalize-commentary] commentary/by-chapter: ${chapterFilesWritten}`);
  console.log(`[normalize-commentary] library/by-work:       ${workFilesWritten}`);
}

main();

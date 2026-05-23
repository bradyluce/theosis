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
  ScriptureReference,
  SourceRecord,
  Work,
  WorkChapter,
} from "@theosis/core";
import { verseLocationKey } from "../../src/lib/content/reference";
import { resolveBookSlug } from "../ingest/commentary/shared";
import { dedupeEntries } from "../ingest/commentary/hcf/dedup";

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
const SEARCH_DIR = join(ROOT, "content", "normalized", "search");

function readJsonFile<T>(absolutePath: string): T {
  return JSON.parse(readFileSync(absolutePath, "utf8")) as T;
}

function writeJsonFile(absolutePath: string, value: unknown) {
  mkdirSync(join(absolutePath, ".."), { recursive: true });
  writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

// ─── Scripture-reference extraction ────────────────────────────────────────
// Scans flowing prose for in-line Scripture citations and resolves them to
// canonical ScriptureReference records. Used by the normalize step to
// populate Work.verseRefs[] across the entire catalog.

// Canonical-form labels for book slugs. Drives the human-readable `label`
// field on each ScriptureReference. Falls back to title-casing the slug
// for any slug not in the map (numbered books always need this map).
const BOOK_SLUG_LABEL: Record<string, string> = {
  genesis: "Genesis", exodus: "Exodus", leviticus: "Leviticus", numbers: "Numbers",
  deuteronomy: "Deuteronomy", joshua: "Joshua", judges: "Judges", ruth: "Ruth",
  "first-samuel": "1 Samuel", "second-samuel": "2 Samuel",
  "first-kings": "1 Kings", "second-kings": "2 Kings",
  "first-chronicles": "1 Chronicles", "second-chronicles": "2 Chronicles",
  ezra: "Ezra", nehemiah: "Nehemiah", esther: "Esther", job: "Job",
  psalms: "Psalms", proverbs: "Proverbs", ecclesiastes: "Ecclesiastes",
  "song-of-solomon": "Song of Solomon", isaiah: "Isaiah", jeremiah: "Jeremiah",
  lamentations: "Lamentations", ezekiel: "Ezekiel", daniel: "Daniel",
  hosea: "Hosea", joel: "Joel", amos: "Amos", obadiah: "Obadiah", jonah: "Jonah",
  micah: "Micah", nahum: "Nahum", habakkuk: "Habakkuk", zephaniah: "Zephaniah",
  haggai: "Haggai", zechariah: "Zechariah", malachi: "Malachi",
  wisdom: "Wisdom", sirach: "Sirach", baruch: "Baruch", tobit: "Tobit",
  judith: "Judith", "first-maccabees": "1 Maccabees", "second-maccabees": "2 Maccabees",
  matthew: "Matthew", mark: "Mark", luke: "Luke", john: "John", acts: "Acts",
  romans: "Romans", "first-corinthians": "1 Corinthians", "second-corinthians": "2 Corinthians",
  galatians: "Galatians", ephesians: "Ephesians", philippians: "Philippians",
  colossians: "Colossians", "first-thessalonians": "1 Thessalonians",
  "second-thessalonians": "2 Thessalonians", "first-timothy": "1 Timothy",
  "second-timothy": "2 Timothy", titus: "Titus", philemon: "Philemon",
  hebrews: "Hebrews", james: "James", "first-peter": "1 Peter", "second-peter": "2 Peter",
  "first-john": "1 John", "second-john": "2 John", "third-john": "3 John",
  jude: "Jude", revelation: "Revelation",
};

function labelForBookSlug(slug: string): string {
  return BOOK_SLUG_LABEL[slug] ?? slug.split("-").map((s) => s[0]!.toUpperCase() + s.slice(1)).join(" ");
}

// Regex permissive enough to catch the common American/British citation
// styles in prose: "Matt 5:3", "Matt. 5:3", "Matthew 5:3", "1 Cor 13:1",
// "I Cor 13:1", "Heb. 11:1-2", "Romans 8:31-39". Captures:
//   1: book name (with optional 1/2/3 or I/II/III prefix and optional period)
//   2: chapter number
//   3: starting verse
//   4: optional ending verse (range)
//
// Validated downstream by calling resolveBookSlug() on the captured book
// name; matches that don't resolve to a known canonical book are discarded.
const CITATION_RE =
  /\b((?:[1-3]\s+|I{1,3}\s+)?(?:[A-Z][a-zé]{1,16}\.?))\s+(\d{1,3}):(\d{1,3})(?:[-–](\d{1,3}))?\b/g;

function extractScriptureRefs(paragraphText: string): ScriptureReference[] {
  const seen = new Map<string, ScriptureReference>();
  CITATION_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CITATION_RE.exec(paragraphText)) !== null) {
    const rawBook = (m[1] ?? "").trim();
    const chapter = Number.parseInt(m[2] ?? "", 10);
    const verseStart = Number.parseInt(m[3] ?? "", 10);
    const verseEnd = m[4] ? Number.parseInt(m[4], 10) : undefined;
    if (!Number.isFinite(chapter) || !Number.isFinite(verseStart)) continue;
    if (verseEnd !== undefined && (!Number.isFinite(verseEnd) || verseEnd < verseStart)) continue;
    const slug = resolveBookSlug(rawBook);
    if (!slug) continue;
    const bookLabel = labelForBookSlug(slug);
    const label = verseEnd
      ? `${bookLabel} ${chapter}:${verseStart}-${verseEnd}`
      : `${bookLabel} ${chapter}:${verseStart}`;
    const key = `${slug}.${chapter}.${verseStart}.${verseEnd ?? ""}`;
    if (!seen.has(key)) {
      seen.set(key, {
        bookSlug: slug,
        chapterNumber: chapter,
        verseStart,
        verseEnd,
        label,
      });
    }
  }
  return [...seen.values()];
}

function collectVerseRefsForWork(chapters: WorkChapter[]): ScriptureReference[] {
  const merged = new Map<string, { ref: ScriptureReference; count: number }>();
  for (const chapter of chapters) {
    for (const section of chapter.sections) {
      for (const paragraph of section.paragraphs) {
        for (const ref of extractScriptureRefs(paragraph.text)) {
          const key = `${ref.bookSlug}.${ref.chapterNumber}.${ref.verseStart}.${ref.verseEnd ?? ""}`;
          const existing = merged.get(key);
          if (existing) {
            existing.count += 1;
          } else {
            merged.set(key, { ref, count: 1 });
          }
        }
      }
    }
  }
  // Sort by frequency descending, then by canonical book order (alphabetic
  // slug is good enough — full canonical ordering would need the book-canon
  // module). Cap at 200 to keep Work records reasonable.
  return [...merged.values()]
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      if (a.ref.bookSlug !== b.ref.bookSlug) return a.ref.bookSlug.localeCompare(b.ref.bookSlug);
      if (a.ref.chapterNumber !== b.ref.chapterNumber) return a.ref.chapterNumber - b.ref.chapterNumber;
      return a.ref.verseStart - b.ref.verseStart;
    })
    .slice(0, 200)
    .map((entry) => entry.ref);
}

// ─── Search index ──────────────────────────────────────────────────────────
// Flat per-chapter entries used by src/features/search/search-engine.ts to
// surface library prose in keyword search. Each entry carries enough metadata
// for the search-result card to render without extra catalog lookups.

type SearchLibraryEntry = {
  workId: string;
  workSlug: string;
  workTitle: string;
  chapterId: string;
  chapterOrder: number;
  chapterLabel: string;
  chapterTitle: string;
  personId: string;
  personName: string;
  topicSlugs: string[];
  excerpt: string;
};

function truncateExcerpt(text: string, maxLength: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  return clean.slice(0, maxLength - 1).trimEnd() + "…";
}

function buildSearchLibraryEntry(args: {
  chapter: WorkChapter;
  work: Work;
  personName: string;
}): SearchLibraryEntry {
  // Excerpt the first paragraph of the first section that has body content.
  let excerptSource = "";
  outer: for (const section of args.chapter.sections) {
    for (const p of section.paragraphs) {
      if (p.text && p.text.length >= 40) {
        excerptSource = p.text;
        break outer;
      }
    }
  }
  return {
    workId: args.work.id,
    workSlug: args.work.slug,
    workTitle: args.work.title,
    chapterId: args.chapter.id,
    chapterOrder: args.chapter.order,
    chapterLabel: args.chapter.label,
    chapterTitle: args.chapter.title,
    personId: args.work.personId,
    personName: args.personName,
    topicSlugs: [...args.work.topicSlugs],
    excerpt: truncateExcerpt(excerptSource, 280),
  };
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

  // Cross-corpus fuzzy de-duplication. Runs per-bucket (each bucket already
  // shares a target, so the dedup re-blocks only by personId). When the
  // same Father's near-identical comment was ingested from multiple sources
  // (typically the existing curated parsers + the HCF bulk corpus), the
  // earlier ingest (preferred by the dedup's scorer) wins, and the HCF
  // version's source ID is folded into the kept entry's provenance array.
  let dedupEntriesIn = 0;
  let dedupEntriesOut = 0;
  let dedupMerges = 0;
  const dedupSamples: Array<{ keptId: string; droppedId: string; jaccard: number }> = [];

  for (const [location, entries] of byVerseBuckets) {
    dedupEntriesIn += entries.length;
    if (entries.length < 2) {
      dedupEntriesOut += entries.length;
      continue;
    }
    const { kept, report } = dedupeEntries(entries);
    byVerseBuckets.set(location, kept);
    dedupEntriesOut += kept.length;
    dedupMerges += report.duplicatesMerged;
    if (dedupSamples.length < 20) {
      dedupSamples.push(...report.samples.slice(0, 20 - dedupSamples.length));
    }
  }
  for (const [location, entries] of byChapterBuckets) {
    dedupEntriesIn += entries.length;
    if (entries.length < 2) {
      dedupEntriesOut += entries.length;
      continue;
    }
    const { kept, report } = dedupeEntries(entries);
    byChapterBuckets.set(location, kept);
    dedupEntriesOut += kept.length;
    dedupMerges += report.duplicatesMerged;
  }

  // Persist a report so behavior is auditable across runs. Reports live
  // in a sibling _reports/ subdir so the main GENERATED_DIR contains only
  // commentary bundles (every *.json in GENERATED_DIR is read back as a
  // bundle on the next run).
  const dedupReport = {
    entriesIn: dedupEntriesIn,
    entriesOut: dedupEntriesOut,
    duplicatesMerged: dedupMerges,
    samples: dedupSamples,
  };
  writeJsonFile(join(GENERATED_DIR, "_reports", "dedup-report.json"), dedupReport);
  console.log(
    `[normalize-commentary] dedup: in=${dedupEntriesIn} out=${dedupEntriesOut} merged=${dedupMerges}`,
  );

  // Write commentary/by-verse files. Sort entries within a bucket by rank desc
  // to match the loader's loadChapterCommentary post-sort.
  const byVerseIndex: Record<string, Record<string, number[]>> = {};
  let verseFilesWritten = 0;
  // Soft-warn threshold — if a per-verse file balloons past this, surface
  // so we know to start sharding. 200 entries is generous; current
  // corpora produce much smaller files.
  const SOFT_WARN_ENTRIES = 200;
  let oversizedFileWarnings = 0;
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

    if (entries.length > SOFT_WARN_ENTRIES) {
      oversizedFileWarnings++;
      if (oversizedFileWarnings <= 5) {
        console.warn(
          `[normalize-commentary] verse file ${location} has ${entries.length} entries (>${SOFT_WARN_ENTRIES}); consider sharding.`,
        );
      }
    }

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
  if (oversizedFileWarnings > 5) {
    console.warn(
      `[normalize-commentary] ... and ${oversizedFileWarnings - 5} more oversized verse files (total ${oversizedFileWarnings}).`,
    );
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

  // ── verseRefs population ────────────────────────────────────────────────
  // Scan every Work's chapter prose for Scripture citations and write the
  // resulting ScriptureReference[] back to the Work record in worksById, so
  // the catalog write picks them up. Runs after the by-work files are on
  // disk but before catalog assembly.
  let worksWithRefs = 0;
  let totalRefsCollected = 0;
  for (const [workId, byOrder] of chaptersByWork) {
    const chapters = [...byOrder.values()].sort((a, b) => a.order - b.order);
    if (chapters.length === 0) continue;
    const refs = collectVerseRefsForWork(chapters);
    if (refs.length === 0) continue;
    const work = worksById.get(workId);
    if (!work) continue;
    worksById.set(workId, { ...work, verseRefs: refs });
    worksWithRefs += 1;
    totalRefsCollected += refs.length;
  }

  // ── Search index ───────────────────────────────────────────────────────
  // Emit a flat per-chapter search-index file consumed by the client-side
  // fuse search engine (src/features/search/search-engine.ts).
  const searchLibraryEntries: SearchLibraryEntry[] = [];
  for (const [workId, byOrder] of chaptersByWork) {
    const work = worksById.get(workId);
    if (!work) continue;
    const person = peopleById.get(work.personId);
    const personName = person?.honorific
      ? `${person.honorific} ${person.name}`
      : person?.name ?? "";
    const chapters = [...byOrder.values()].sort((a, b) => a.order - b.order);
    for (const chapter of chapters) {
      searchLibraryEntries.push(
        buildSearchLibraryEntry({ chapter, work, personName }),
      );
    }
  }
  searchLibraryEntries.sort((a, b) => {
    if (a.workId !== b.workId) return a.workId.localeCompare(b.workId);
    return a.chapterOrder - b.chapterOrder;
  });
  writeJsonFile(join(SEARCH_DIR, "library.json"), {
    version: "1",
    entries: searchLibraryEntries,
  });

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
  console.log(
    `[normalize-commentary] verseRefs populated:   ${worksWithRefs}/${worksSorted.length} works (${totalRefsCollected} refs)`,
  );
  console.log(
    `[normalize-commentary] search/library:        ${searchLibraryEntries.length} entries`,
  );
  console.log(`[normalize-commentary] library/by-work:       ${workFilesWritten}`);
}

main();

import "server-only";
import fs from "node:fs";
import path from "node:path";
import type {
  CommentaryEntry,
  Person,
  PsalterScheme,
  SourceRecord,
  Work,
  WorkChapter,
} from "@theosis/core";
import { verseLocationKey } from "@/lib/content/reference";
import { toEntryChapterNumbers } from "@/lib/content/psalter-numbering";
import { isCanonizedSaint } from "@/lib/content/saint-predicate";
import {
  commentaryEntries as seedCommentary,
  people as seedPeople,
  sourceRecords as seedSources,
  works as seedWorks,
} from "@/lib/content/seed/library";

// Reads commentary content from the per-file normalized trees emitted by
// scripts/normalize/normalize-commentary.ts:
//
//   content/normalized/commentary/
//     catalog.json                                # people/works/sources + { byVerse, byChapter }
//     by-verse/<book>/<chapter>/<verse>.json
//     by-chapter/<book>/<chapter>.json
//
//   content/normalized/library/
//     catalog.json                                # people/works/sources + { byWork }
//     by-work/<workId>/<order>.json
//
// Catalogs are read eagerly once and cached for the process lifetime; per-file
// content is lazy-loaded on demand and cached per key. The seed library
// (src/lib/content/seed/library.ts) is still merged in, with seed winning on
// id conflicts so hand-authored Person/Work/Source records stay authoritative.
// Catalogs duplicate the people/works/sources arrays so each consumer (verse
// reader vs library reader) is self-contained; the loader picks the commentary
// catalog as primary because it's the one the bible reader always reads.

const COMMENTARY_DIR = path.join(process.cwd(), "content/normalized/commentary");
const LIBRARY_DIR = path.join(process.cwd(), "content/normalized/library");

// --- Catalog + file shapes -------------------------------------------------

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

// --- Cached catalog reads --------------------------------------------------

let commentaryCatalogCache: CommentaryCatalog | null | undefined = undefined;
let libraryCatalogCache: LibraryCatalog | null | undefined = undefined;

function loadCommentaryCatalog(): CommentaryCatalog | null {
  if (commentaryCatalogCache !== undefined) return commentaryCatalogCache;
  const filePath = path.join(COMMENTARY_DIR, "catalog.json");
  if (!fs.existsSync(filePath)) {
    commentaryCatalogCache = null;
    return commentaryCatalogCache;
  }
  try {
    commentaryCatalogCache = JSON.parse(
      fs.readFileSync(filePath, "utf8"),
    ) as CommentaryCatalog;
  } catch (error) {
    console.warn("[commentary-loader] failed to read commentary catalog:", error);
    commentaryCatalogCache = null;
  }
  return commentaryCatalogCache;
}

function loadLibraryCatalog(): LibraryCatalog | null {
  if (libraryCatalogCache !== undefined) return libraryCatalogCache;
  const filePath = path.join(LIBRARY_DIR, "catalog.json");
  if (!fs.existsSync(filePath)) {
    libraryCatalogCache = null;
    return libraryCatalogCache;
  }
  try {
    libraryCatalogCache = JSON.parse(
      fs.readFileSync(filePath, "utf8"),
    ) as LibraryCatalog;
  } catch (error) {
    console.warn("[commentary-loader] failed to read library catalog:", error);
    libraryCatalogCache = null;
  }
  return libraryCatalogCache;
}

// Pick whichever catalog has the metadata first. They duplicate identical
// people/works/sources arrays, so either is authoritative; this prefers the
// commentary catalog so a degraded environment that has commentary/ but not
// library/ still surfaces the library metadata for verse-reader pages.
function getNormalizedPeople(): Person[] {
  return loadCommentaryCatalog()?.people ?? loadLibraryCatalog()?.people ?? [];
}

function getNormalizedWorks(): Work[] {
  return loadCommentaryCatalog()?.works ?? loadLibraryCatalog()?.works ?? [];
}

function getNormalizedSources(): SourceRecord[] {
  return loadCommentaryCatalog()?.sources ?? loadLibraryCatalog()?.sources ?? [];
}

// --- Lazy per-file caches --------------------------------------------------

// All caches hold the same sentinel — an empty array means "we tried, no
// file" — so a single membership check tells us not to re-touch the disk.

const verseFileCache = new Map<string, CommentaryEntry[]>();
const chapterFileCache = new Map<string, CommentaryEntry[]>();
const workChaptersCache = new Map<string, WorkChapter[]>();

function loadVerseEntries(
  bookSlug: string,
  chapterNumber: number,
  verseNumber: number,
): CommentaryEntry[] {
  const key = `${bookSlug}.${chapterNumber}.${verseNumber}`;
  const cached = verseFileCache.get(key);
  if (cached) return cached;

  const filePath = path.join(
    COMMENTARY_DIR,
    "by-verse",
    bookSlug,
    String(chapterNumber),
    `${verseNumber}.json`,
  );
  if (!fs.existsSync(filePath)) {
    verseFileCache.set(key, []);
    return [];
  }
  try {
    const file = JSON.parse(fs.readFileSync(filePath, "utf8")) as ByVerseFile;
    verseFileCache.set(key, file.entries);
    return file.entries;
  } catch (error) {
    console.warn(`[commentary-loader] failed to read ${filePath}:`, error);
    verseFileCache.set(key, []);
    return [];
  }
}

function loadChapterLevelEntries(
  bookSlug: string,
  chapterNumber: number,
): CommentaryEntry[] {
  const key = `${bookSlug}.${chapterNumber}`;
  const cached = chapterFileCache.get(key);
  if (cached) return cached;

  const filePath = path.join(
    COMMENTARY_DIR,
    "by-chapter",
    bookSlug,
    `${chapterNumber}.json`,
  );
  if (!fs.existsSync(filePath)) {
    chapterFileCache.set(key, []);
    return [];
  }
  try {
    const file = JSON.parse(fs.readFileSync(filePath, "utf8")) as ByChapterFile;
    chapterFileCache.set(key, file.entries);
    return file.entries;
  } catch (error) {
    console.warn(`[commentary-loader] failed to read ${filePath}:`, error);
    chapterFileCache.set(key, []);
    return [];
  }
}

function loadWorkChaptersFromDisk(workId: string): WorkChapter[] {
  const cached = workChaptersCache.get(workId);
  if (cached) return cached;

  const catalog = loadLibraryCatalog();
  const entry = catalog?.index.byWork[workId];
  if (!entry || entry.orders.length === 0) {
    workChaptersCache.set(workId, []);
    return [];
  }

  const chapters: WorkChapter[] = [];
  for (const order of entry.orders) {
    const filePath = path.join(LIBRARY_DIR, "by-work", workId, `${order}.json`);
    try {
      const file = JSON.parse(fs.readFileSync(filePath, "utf8")) as ByWorkFile;
      chapters.push(file.chapter);
    } catch (error) {
      console.warn(`[commentary-loader] failed to read ${filePath}:`, error);
    }
  }
  chapters.sort((left, right) => left.order - right.order);
  workChaptersCache.set(workId, chapters);
  return chapters;
}

// --- workId → entries index (option c) -------------------------------------
//
// `getCommentaryEntriesForWork` needs every normalized entry that carries a
// given workId; the catalog indexes by location, not by workId. We build the
// inverse index on first call by reading every by-verse / by-chapter file the
// catalog references, then cache for the rest of the process lifetime. Cost
// is one full scan (~4,623 files, ~50 MB) the first time a library work page
// is rendered; subsequent calls are O(1). Verse-reader pages never trigger
// this — they pull only their own (book, chapter) files.

let workIdEntriesCache: Map<string, CommentaryEntry[]> | undefined = undefined;

function getNormalizedEntriesByWorkId(): Map<string, CommentaryEntry[]> {
  if (workIdEntriesCache !== undefined) return workIdEntriesCache;

  const map = new Map<string, CommentaryEntry[]>();
  const catalog = loadCommentaryCatalog();
  if (!catalog) {
    workIdEntriesCache = map;
    return map;
  }

  const push = (workId: string, entry: CommentaryEntry) => {
    let bucket = map.get(workId);
    if (!bucket) {
      bucket = [];
      map.set(workId, bucket);
    }
    bucket.push(entry);
  };

  for (const [bookSlug, chapters] of Object.entries(catalog.index.byVerse)) {
    for (const [chapterStr, verses] of Object.entries(chapters)) {
      const chapterNumber = Number.parseInt(chapterStr, 10);
      if (Number.isNaN(chapterNumber)) continue;
      for (const verseNumber of verses) {
        for (const entry of loadVerseEntries(bookSlug, chapterNumber, verseNumber)) {
          push(entry.workId, entry);
        }
      }
    }
  }
  for (const [bookSlug, chapters] of Object.entries(catalog.index.byChapter)) {
    for (const chapterNumber of chapters) {
      for (const entry of loadChapterLevelEntries(bookSlug, chapterNumber)) {
        push(entry.workId, entry);
      }
    }
  }

  workIdEntriesCache = map;
  return map;
}

// --- Public surface --------------------------------------------------------
//
// All 11 historical exports preserved in shape and behavior. The only API
// change is that some calls that were previously O(all bundles) on first hit
// are now O(small) — verse-reader queries touch a couple of files, work-page
// queries trigger the one-time workId-index build.

export function getChaptersForWork(workId: string): WorkChapter[] {
  return loadWorkChaptersFromDisk(workId);
}

export function getPersonByIdFromAll(personId: string): Person | undefined {
  return getNormalizedPeople().find((person) => person.id === personId);
}

export function getSourceByIdFromAll(sourceId: string): SourceRecord | undefined {
  return getNormalizedSources().find((source) => source.id === sourceId);
}

// Aggregated view of every normalized entry + chapter + catalog record. Kept
// for backwards compat with anything that wanted "give me everything"; not
// called anywhere in the app today. Implemented by triggering every lazy
// loader, which obviously defeats the lazy benefit — don't add new callers.
type AggregatedCommentary = {
  entries: CommentaryEntry[];
  people: Person[];
  works: Work[];
  sources: SourceRecord[];
  chapters: WorkChapter[];
};

export function getGeneratedCommentary(): AggregatedCommentary | null {
  const commentaryCatalog = loadCommentaryCatalog();
  const libraryCatalog = loadLibraryCatalog();
  if (!commentaryCatalog && !libraryCatalog) return null;

  const entries: CommentaryEntry[] = [];
  for (const list of getNormalizedEntriesByWorkId().values()) {
    entries.push(...list);
  }

  const chapters: WorkChapter[] = [];
  if (libraryCatalog) {
    for (const workId of Object.keys(libraryCatalog.index.byWork)) {
      chapters.push(...loadWorkChaptersFromDisk(workId));
    }
  }

  return {
    entries,
    people: getNormalizedPeople(),
    works: getNormalizedWorks(),
    sources: getNormalizedSources(),
    chapters,
  };
}

export type WorkCommentaryEntry = {
  entry: CommentaryEntry;
  person: Person | undefined;
  source: SourceRecord | undefined;
  bookSlug: string;
  chapterNumber: number;
  verseNumber: number;
};

export function getCommentaryEntriesForWork(workId: string): WorkCommentaryEntry[] {
  const seedMatches = seedCommentary.filter((entry) => entry.workId === workId);
  const normalizedMatches = getNormalizedEntriesByWorkId().get(workId) ?? [];

  const personById = buildLookup(seedPeople, getNormalizedPeople());
  const sourceById = buildLookup(seedSources, getNormalizedSources());

  // Catena entries on a verse range are emitted once per verse with IDs like
  // "catena-mark-0001-v41", "...-v42", etc. Dedupe by base ID so the work
  // page shows each commentary once, keeping the lowest-numbered verse (which
  // wins because the seed-then-normalized + sort-by-chapter-then-verse below
  // surfaces the lowest verse first).
  const allEntries: CommentaryEntry[] = [...seedMatches, ...normalizedMatches];
  const seenBaseIds = new Set<string>();
  const result: WorkCommentaryEntry[] = [];

  for (const entry of allEntries) {
    if (entry.workId !== workId) continue;
    if (!entry.targetVerseId) continue;
    const baseId = entry.id.replace(/-v\d+$/, "");
    if (seenBaseIds.has(baseId)) continue;
    seenBaseIds.add(baseId);

    const location = verseLocationKey(entry.targetVerseId);
    const [bookSlug, chapterStr, verseStr] = location.split(".");
    const chapterNumber = Number.parseInt(chapterStr ?? "", 10);
    const verseNumber = Number.parseInt(verseStr ?? "", 10);
    if (!bookSlug || Number.isNaN(chapterNumber) || Number.isNaN(verseNumber)) continue;
    result.push({
      entry,
      person: personById.get(entry.personId),
      source: sourceById.get(entry.sourceId),
      bookSlug,
      chapterNumber,
      verseNumber,
    });
  }
  result.sort((a, b) => {
    if (a.chapterNumber !== b.chapterNumber) return a.chapterNumber - b.chapterNumber;
    if (a.verseNumber !== b.verseNumber) return a.verseNumber - b.verseNumber;
    return b.entry.rank - a.entry.rank;
  });
  return result;
}

export function getWorkBySlugFromAll(slug: string): Work | undefined {
  return (
    seedWorks.find((w) => w.slug === slug) ??
    getNormalizedWorks().find((w) => w.slug === slug)
  );
}

// Merged people list: seed first, then any additional people declared in the
// normalized commentary catalog. Used by the library browser so Fathers who
// only live in the parsed-bundle records still surface in search, filters,
// and the People grid.
export function getAllPeopleFromAll(): Person[] {
  const byId = new Map<string, Person>();
  for (const person of seedPeople) byId.set(person.id, person);
  for (const person of getNormalizedPeople()) {
    if (!byId.has(person.id)) byId.set(person.id, person);
  }
  return Array.from(byId.values());
}

// Same as getAllPeopleFromAll() but filtered to library-worthy Persons:
//   - Canonized saints (honorific, feast day, or kind="saint" — see
//     isCanonizedSaint), OR
//   - Anyone who authors at least one Work in the merged catalog (with
//     a real title, not the "Untitled commentary" placeholder)
// "Author of any Work" is the broader-than-long-form rule the user
// asked for: after work-title canonicalization, every Work in the
// catalog represents a real long-form thing (not per-verse cites), so
// authoring one is enough to merit a Library spot.
//
// Citation-only Persons whose only Work is "Untitled commentary" are
// still excluded — these are HCF entries lacking source_title at all,
// usually orphaned anonymous-tradition fragments. They still resolve
// via getPersonById so commentary panels can render their attribution.
export function getLibraryPeopleFromAll(): Person[] {
  const allPeople = getAllPeopleFromAll();
  const realWorkAuthorIds = collectRealWorkAuthorIds();
  return allPeople.filter(
    (person) => isCanonizedSaint(person) || realWorkAuthorIds.has(person.id),
  );
}

// PersonIds of authors who own at least one Work with a real title
// (anything except the "Untitled commentary" placeholder that the HCF
// parser emits for blocks lacking a source_title). Drawn from the
// merged seed+catalog Work set so seed-only Works also count. Cached
// for the process lifetime.
let realWorkAuthorIdsCache: Set<string> | undefined;
function collectRealWorkAuthorIds(): Set<string> {
  if (realWorkAuthorIdsCache) return realWorkAuthorIdsCache;
  const ids = new Set<string>();
  for (const work of getAllWorksFromAll()) {
    const title = (work.title ?? "").trim().toLowerCase();
    if (!title || title === "untitled commentary") continue;
    ids.add(work.personId);
  }
  realWorkAuthorIdsCache = ids;
  return ids;
}

export function getAllWorksFromAll(): Work[] {
  const byId = new Map<string, Work>();
  for (const work of seedWorks) byId.set(work.id, work);
  for (const work of getNormalizedWorks()) {
    if (!byId.has(work.id)) byId.set(work.id, work);
  }
  return Array.from(byId.values());
}

export function getAllSourcesFromAll(): SourceRecord[] {
  const byId = new Map<string, SourceRecord>();
  for (const source of seedSources) byId.set(source.id, source);
  for (const source of getNormalizedSources()) {
    if (!byId.has(source.id)) byId.set(source.id, source);
  }
  return Array.from(byId.values());
}

export function getPersonBySlugFromAll(slug: string): Person | undefined {
  return (
    seedPeople.find((p) => p.slug === slug) ??
    getNormalizedPeople().find((p) => p.slug === slug)
  );
}

export function getWorksForPersonFromAll(personId: string): Work[] {
  const byId = new Map<string, Work>();
  for (const work of seedWorks) {
    if (work.personId === personId) byId.set(work.id, work);
  }
  for (const work of getNormalizedWorks()) {
    if (work.personId === personId && !byId.has(work.id)) byId.set(work.id, work);
  }
  return Array.from(byId.values());
}

export type ChapterCommentaryView = {
  // Commentary keyed by canonical verse location ("bookSlug.chapter.verse")
  directByLocation: Map<string, CommentaryEntry[]>;
  relatedByLocation: Map<string, CommentaryEntry[]>;
  // Commentary targeting the chapter as a whole
  chapterLevel: CommentaryEntry[];
  // Metadata lookups (seed + normalized, merged)
  personById: Map<string, Person>;
  workById: Map<string, Work>;
  sourceById: Map<string, SourceRecord>;
};

function buildLookup<T extends { id: string }>(...sources: T[][]): Map<string, T> {
  const map = new Map<string, T>();
  for (const source of sources) {
    for (const item of source) {
      if (!map.has(item.id)) map.set(item.id, item);
    }
  }
  return map;
}

// Given a reader's (book, chapter, scheme), enumerate the chapter numbers in
// the entry-scheme that could match. For non-psalter books this is always
// just [chapter]; for psalms it's the union over the three possible entry
// schemes (undefined / MT / LXX) so we know which by-verse and by-chapter
// files to load before applying the per-entry scheme check.
function candidateEntryChapters(
  bookSlug: string,
  readerChapter: number,
  readerScheme: PsalterScheme | undefined,
): number[] {
  if (bookSlug !== "psalms") return [readerChapter];
  const set = new Set<number>();
  for (const entryScheme of [undefined, "MT", "LXX"] as const) {
    for (const candidate of toEntryChapterNumbers(readerChapter, readerScheme, entryScheme)) {
      set.add(candidate);
    }
  }
  return Array.from(set);
}

export function loadChapterCommentary(
  bookSlug: string,
  chapterNumber: number,
  readerPsalterScheme?: PsalterScheme,
): ChapterCommentaryView {
  const personById = buildLookup(seedPeople, getNormalizedPeople());
  const workById = buildLookup(seedWorks, getNormalizedWorks());
  const sourceById = buildLookup(seedSources, getNormalizedSources());

  const directByLocation = new Map<string, CommentaryEntry[]>();
  const relatedByLocation = new Map<string, CommentaryEntry[]>();
  const chapterLevel: CommentaryEntry[] = [];

  const isPsalter = bookSlug === "psalms";
  const candidateChapters = candidateEntryChapters(bookSlug, chapterNumber, readerPsalterScheme);

  // Seed entries are scanned in full — they're hand-authored, small, and
  // already in memory.
  const entriesToCheck: CommentaryEntry[] = [...seedCommentary];

  // Normalized entries: load just the files the candidate chapters reference.
  const catalog = loadCommentaryCatalog();
  if (catalog) {
    for (const candidateChapter of candidateChapters) {
      const verses = catalog.index.byVerse[bookSlug]?.[String(candidateChapter)] ?? [];
      for (const verseNumber of verses) {
        entriesToCheck.push(...loadVerseEntries(bookSlug, candidateChapter, verseNumber));
      }
      if ((catalog.index.byChapter[bookSlug] ?? []).includes(candidateChapter)) {
        entriesToCheck.push(...loadChapterLevelEntries(bookSlug, candidateChapter));
      }
    }
  }

  for (const entry of entriesToCheck) {
    const entryScheme = entry.psalterScheme;

    if (entry.relation === "chapter") {
      if (!entry.targetChapterId) continue;
      const [entryBook, entryChapterStr] = entry.targetChapterId.split(".");
      if (entryBook !== bookSlug) continue;
      const entryChapter = Number.parseInt(entryChapterStr, 10);
      if (Number.isNaN(entryChapter)) continue;

      const acceptedChapters = isPsalter
        ? toEntryChapterNumbers(chapterNumber, readerPsalterScheme, entryScheme)
        : [chapterNumber];
      if (acceptedChapters.includes(entryChapter)) chapterLevel.push(entry);
      continue;
    }

    if (!entry.targetVerseId) continue;
    const location = verseLocationKey(entry.targetVerseId);
    const [entryBook, entryChapterStr, entryVerseStr] = location.split(".");
    if (entryBook !== bookSlug) continue;
    const entryChapter = Number.parseInt(entryChapterStr, 10);
    if (Number.isNaN(entryChapter)) continue;

    const acceptedChapters = isPsalter
      ? toEntryChapterNumbers(chapterNumber, readerPsalterScheme, entryScheme)
      : [chapterNumber];
    if (!acceptedChapters.includes(entryChapter)) continue;

    // Key buckets by the reader's chapter number so the UI groups by what the
    // reader sees, not by the entry's underlying tag.
    const displayLocation = `${bookSlug}.${chapterNumber}.${entryVerseStr}`;
    const target = entry.relation === "verse" ? directByLocation : relatedByLocation;
    const existing = target.get(displayLocation);
    if (existing) {
      existing.push(entry);
    } else {
      target.set(displayLocation, [entry]);
    }
  }

  for (const map of [directByLocation, relatedByLocation]) {
    for (const list of map.values()) {
      list.sort((left, right) => right.rank - left.rank);
    }
  }
  chapterLevel.sort((left, right) => right.rank - left.rank);

  return {
    directByLocation,
    relatedByLocation,
    chapterLevel,
    personById,
    workById,
    sourceById,
  };
}

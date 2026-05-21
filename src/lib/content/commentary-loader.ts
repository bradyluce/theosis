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
} from "@/domain/content/types";
import { toEntryChapterNumbers } from "@/lib/content/psalter-numbering";
import {
  commentaryEntries as seedCommentary,
  people as seedPeople,
  sourceRecords as seedSources,
  works as seedWorks,
} from "@/lib/content/seed/library";

const GENERATED_DIR = path.join(process.cwd(), "content/generated/commentary");

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
  // Optional long-form reading content for treatises and homilies that ship
  // as full prose alongside (or instead of) verse-keyed commentary entries.
  chapters?: WorkChapter[];
};

type CommentaryBundle = CommentaryBundleV1 | CommentaryBundleV2;

type AggregatedCommentary = {
  entries: CommentaryEntry[];
  people: Person[];
  works: Work[];
  sources: SourceRecord[];
  chapters: WorkChapter[];
};

let cache: AggregatedCommentary | null | undefined = undefined;

function loadAll(): AggregatedCommentary | null {
  if (cache !== undefined) return cache;
  if (!fs.existsSync(GENERATED_DIR)) {
    cache = null;
    return cache;
  }
  const files = fs
    .readdirSync(GENERATED_DIR)
    .filter((name) => name.endsWith(".json"));
  if (files.length === 0) {
    cache = null;
    return cache;
  }

  const entries: CommentaryEntry[] = [];
  const people: Person[] = [];
  const works: Work[] = [];
  const sources: SourceRecord[] = [];
  const chapters: WorkChapter[] = [];

  for (const fileName of files) {
    try {
      const raw = fs.readFileSync(path.join(GENERATED_DIR, fileName), "utf8");
      const bundle = JSON.parse(raw) as CommentaryBundle;
      entries.push(...bundle.entries);
      if (bundle.version === "1") {
        people.push(bundle.person);
        works.push(bundle.work);
        sources.push(bundle.source);
      } else {
        people.push(...bundle.people);
        works.push(...bundle.works);
        sources.push(...bundle.sources);
        if (bundle.chapters) chapters.push(...bundle.chapters);
      }
    } catch (error) {
      console.warn(`[commentary-loader] failed to read ${fileName}:`, error);
    }
  }

  cache = { entries, people, works, sources, chapters };
  return cache;
}

export function getChaptersForWork(workId: string): WorkChapter[] {
  const generated = loadAll();
  if (!generated) return [];
  return generated.chapters
    .filter((chapter) => chapter.workId === workId)
    .sort((left, right) => left.order - right.order);
}

export function getPersonByIdFromAll(personId: string): Person | undefined {
  const generated = loadAll();
  if (!generated) return undefined;
  return generated.people.find((person) => person.id === personId);
}

export function getSourceByIdFromAll(sourceId: string): SourceRecord | undefined {
  const generated = loadAll();
  if (!generated) return undefined;
  return generated.sources.find((source) => source.id === sourceId);
}

export function getGeneratedCommentary(): AggregatedCommentary | null {
  return loadAll();
}

export type WorkCommentaryEntry = {
  entry: CommentaryEntry;
  person: Person | undefined;
  source: SourceRecord | undefined;
  // Canonical "bookSlug.chapter.verse" parsed off the entry's targetVerseId
  bookSlug: string;
  chapterNumber: number;
  verseNumber: number;
};

export function getCommentaryEntriesForWork(workId: string): WorkCommentaryEntry[] {
  const generated = loadAll();
  const allEntries = generated
    ? [...seedCommentary, ...generated.entries]
    : [...seedCommentary];

  const personById = buildLookup(seedPeople, generated?.people ?? []);
  const sourceById = buildLookup(seedSources, generated?.sources ?? []);

  // Catena entries on a verse range are emitted once per verse with IDs like
  // "catena-mark-0001-v41", "catena-mark-0001-v42", etc. Dedupe by base ID so
  // the work page shows each commentary once, keeping the lowest-numbered verse.
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
  const generated = loadAll();
  return (
    generated?.works.find((w) => w.slug === slug) ??
    seedWorks.find((w) => w.slug === slug)
  );
}

// Like getWorksForPerson in queries.ts but pulls from both seed and generated
// bundles, so works ingested from raw corpora (Augustine NPNF, Gregory NPNF,
// Athanasius NPNF, etc.) surface on the person's library card. Dedupes by
// work id — seed entries win when both are present.
// Merged people list: seed first, then any additional people declared by
// generated commentary bundles. Used by the library browser so Fathers like
// Augustine — who live only in their parsed-bundle Person records — surface
// in search, filters, and the People grid.
export function getAllPeopleFromAll(): Person[] {
  const generated = loadAll();
  const byId = new Map<string, Person>();
  for (const person of seedPeople) byId.set(person.id, person);
  if (generated) {
    for (const person of generated.people) {
      if (!byId.has(person.id)) byId.set(person.id, person);
    }
  }
  return Array.from(byId.values());
}

// Merged works list (same dedupe rules as getAllPeopleFromAll).
export function getAllWorksFromAll(): Work[] {
  const generated = loadAll();
  const byId = new Map<string, Work>();
  for (const work of seedWorks) byId.set(work.id, work);
  if (generated) {
    for (const work of generated.works) {
      if (!byId.has(work.id)) byId.set(work.id, work);
    }
  }
  return Array.from(byId.values());
}

// Merged sources list.
export function getAllSourcesFromAll(): SourceRecord[] {
  const generated = loadAll();
  const byId = new Map<string, SourceRecord>();
  for (const source of seedSources) byId.set(source.id, source);
  if (generated) {
    for (const source of generated.sources) {
      if (!byId.has(source.id)) byId.set(source.id, source);
    }
  }
  return Array.from(byId.values());
}

export function getPersonBySlugFromAll(slug: string): Person | undefined {
  const generated = loadAll();
  return (
    seedPeople.find((p) => p.slug === slug) ??
    generated?.people.find((p) => p.slug === slug)
  );
}

export function getWorksForPersonFromAll(personId: string): Work[] {
  const generated = loadAll();
  const byId = new Map<string, Work>();
  for (const work of seedWorks) {
    if (work.personId === personId) byId.set(work.id, work);
  }
  if (generated) {
    for (const work of generated.works) {
      if (work.personId === personId && !byId.has(work.id)) {
        byId.set(work.id, work);
      }
    }
  }
  return Array.from(byId.values());
}

// Extract the canonical location suffix from any verseId.
// Verse IDs come in the form `{translationId}:{bookSlug}.{chapter}.{verse}`.
// Two verses across translations share the same trailing location.
export function verseLocationKey(verseId: string): string {
  const colonIndex = verseId.indexOf(":");
  return colonIndex === -1 ? verseId : verseId.slice(colonIndex + 1);
}

export type ChapterCommentaryView = {
  // Commentary keyed by canonical verse location ("bookSlug.chapter.verse")
  directByLocation: Map<string, CommentaryEntry[]>;
  relatedByLocation: Map<string, CommentaryEntry[]>;
  // Commentary targeting the chapter as a whole
  chapterLevel: CommentaryEntry[];
  // Metadata lookups (seed + generated, merged)
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

export function loadChapterCommentary(
  bookSlug: string,
  chapterNumber: number,
  readerPsalterScheme?: PsalterScheme,
): ChapterCommentaryView {
  const generated = loadAll();
  const allEntries = generated
    ? [...seedCommentary, ...generated.entries]
    : [...seedCommentary];

  const personById = buildLookup(seedPeople, generated?.people ?? []);
  const workById = buildLookup(seedWorks, generated?.works ?? []);
  const sourceById = buildLookup(seedSources, generated?.sources ?? []);

  const directByLocation = new Map<string, CommentaryEntry[]>();
  const relatedByLocation = new Map<string, CommentaryEntry[]>();
  const chapterLevel: CommentaryEntry[] = [];

  // For the psalter, entries tagged with the opposite scheme need to be
  // shifted into the reader's numbering. For all other books, scheme is
  // irrelevant — use a single identity mapping.
  const isPsalter = bookSlug === "psalms";

  for (const entry of allEntries) {
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

import "server-only";
import fs from "node:fs";
import path from "node:path";
import type {
  CommentaryEntry,
  Person,
  SourceRecord,
  Work,
} from "@/domain/content/types";
import { createChapterId } from "@/lib/content/reference";
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
};

type CommentaryBundle = CommentaryBundleV1 | CommentaryBundleV2;

type AggregatedCommentary = {
  entries: CommentaryEntry[];
  people: Person[];
  works: Work[];
  sources: SourceRecord[];
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
      }
    } catch (error) {
      console.warn(`[commentary-loader] failed to read ${fileName}:`, error);
    }
  }

  cache = { entries, people, works, sources };
  return cache;
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

  const result: WorkCommentaryEntry[] = [];
  for (const entry of allEntries) {
    if (entry.workId !== workId) continue;
    if (!entry.targetVerseId) continue;
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
  // Sort by chapter, then verse, then rank desc to keep top-rated first within a verse
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
): ChapterCommentaryView {
  const generated = loadAll();
  const allEntries = generated
    ? [...seedCommentary, ...generated.entries]
    : [...seedCommentary];

  const personById = buildLookup(seedPeople, generated?.people ?? []);
  const workById = buildLookup(seedWorks, generated?.works ?? []);
  const sourceById = buildLookup(seedSources, generated?.sources ?? []);

  const chapterId = createChapterId(bookSlug, chapterNumber);
  const directByLocation = new Map<string, CommentaryEntry[]>();
  const relatedByLocation = new Map<string, CommentaryEntry[]>();
  const chapterLevel: CommentaryEntry[] = [];

  for (const entry of allEntries) {
    if (entry.relation === "chapter") {
      if (entry.targetChapterId === chapterId) chapterLevel.push(entry);
      continue;
    }

    if (!entry.targetVerseId) continue;
    const location = verseLocationKey(entry.targetVerseId);
    // location format: "bookSlug.chapter.verse"
    const [entryBook, entryChapterStr] = location.split(".");
    if (entryBook !== bookSlug) continue;
    if (Number.parseInt(entryChapterStr, 10) !== chapterNumber) continue;

    const target = entry.relation === "verse" ? directByLocation : relatedByLocation;
    const existing = target.get(location);
    if (existing) {
      existing.push(entry);
    } else {
      target.set(location, [entry]);
    }
  }

  // Sort each verse bucket by rank descending (matches existing seed query behavior)
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

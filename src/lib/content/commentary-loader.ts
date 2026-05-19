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

type CommentaryBundle = {
  version: "1";
  person: Person;
  work: Work;
  source: SourceRecord;
  entries: CommentaryEntry[];
};

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
      people.push(bundle.person);
      works.push(bundle.work);
      sources.push(bundle.source);
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

import { readFileSync } from "node:fs";
import type {
  CommentaryEntry,
  Person,
  SourceRecord,
  Work,
} from "@theosis/core";
import { collapseCitationSpaces, extractExcerpt, resolveBookSlug } from "./shared";

export type CommentaryBundle = {
  version: "1";
  person: Person;
  work: Work;
  source: SourceRecord;
  entries: CommentaryEntry[];
};

type AzkoulParseConfig = {
  filePath: string;
  // Translation prefix for verse IDs — should match the primary translation
  // available in the app. Lookup is done by suffix anyway, so this is
  // just a tagging convention.
  verseTranslationPrefix: string;
};

// Detect a Scripture reference like: "(Matt. 5:1)", "Eph 4:4", "Genesis 1:1-3".
// Tolerant of spaces, abbreviation periods, and optional verse range.
// The book group can include an optional ordinal prefix ("1 ", "2 ", "i ", etc.)
const CITATION_PATTERN =
  /(?:^|[\s(\[])((?:[1-3]\s+|i{1,3}\s+|first\s+|second\s+|third\s+)?[A-Z][a-z]{1,11})(\.?)\s+(\d+):(\d+)(?:-(\d+))?(?=[\s).,;:\]]|$)/g;

const PERSON_ID = "fr-michael-azkoul";
const WORK_ID = "azkoul-teachings-vol-1";
const SOURCE_ID = "azkoul-teachings-source";

function buildPerson(): Person {
  return {
    id: PERSON_ID,
    slug: "michael-azkoul",
    name: "Michael Azkoul",
    honorific: "Fr.",
    kind: "theologian",
    eraLabel: "20th century",
    summary:
      "Orthodox theologian and priest of the Russian Orthodox Church Outside of Russia. Author of theological texts on the teachings of the Orthodox Church.",
    traditions: ["Russian Orthodox Church Outside of Russia"],
    topicSlugs: [],
    featuredWorkIds: [WORK_ID],
  };
}

function buildWork(): Work {
  return {
    id: WORK_ID,
    slug: "teachings-of-the-holy-orthodox-church-vol-1",
    personId: PERSON_ID,
    title: "The Teachings of the Holy Orthodox Church",
    shortTitle: "Teachings, vol. 1",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "1986",
    summary:
      "First of three volumes presenting the teachings of the Orthodox Church through Scripture and the Fathers, intended for the serious layman.",
    topicSlugs: [],
    sourceId: SOURCE_ID,
    verseRefs: [],
  };
}

function buildSource(): SourceRecord {
  return {
    id: SOURCE_ID,
    label: "The Teachings of the Holy Orthodox Church, vol. 1",
    collection: "Dormition Skete Publications",
    sourceType: "pdf",
    url: "",
    note: "Volume 1, 1986. Fr. Michael Azkoul. ISBN 0-935889-01-9.",
    isSeeded: false,
  };
}

export function parseAzkoul(config: AzkoulParseConfig): CommentaryBundle {
  const raw = readFileSync(config.filePath, "utf8");
  // First collapse PDF artifact spaces inside number patterns
  const text = collapseCitationSpaces(raw);

  const entries: CommentaryEntry[] = [];
  const seenKeys = new Set<string>();
  let entryCounter = 0;

  for (const match of text.matchAll(CITATION_PATTERN)) {
    const matchIndex = match.index ?? 0;
    const matchEndIndex = matchIndex + match[0].length;

    const rawBook = match[1].trim();
    const chapterStr = match[3];
    const verseStartStr = match[4];
    const verseEndStr = match[5];

    // Skip obvious false positives: section heading numbers like "Chapter 5",
    // or footnote markers, by checking the book token resolves to a real book.
    const bookSlug = resolveBookSlug(rawBook);
    if (!bookSlug) continue;

    const chapterNumber = Number.parseInt(chapterStr, 10);
    const verseStart = Number.parseInt(verseStartStr, 10);
    const verseEnd = verseEndStr ? Number.parseInt(verseEndStr, 10) : undefined;

    // Plausibility filter — bail on absurd numbers (e.g. PDF artifact "Eph 999:888")
    if (chapterNumber < 1 || chapterNumber > 200) continue;
    if (verseStart < 1 || verseStart > 200) continue;

    // De-duplicate: one entry per (book, chapter, verseStart) — the first
    // citation usually has the richest surrounding context anyway.
    const dedupeKey = `${bookSlug}.${chapterNumber}.${verseStart}`;
    if (seenKeys.has(dedupeKey)) continue;
    seenKeys.add(dedupeKey);

    const excerpt = extractExcerpt(text, matchIndex, matchEndIndex);
    if (excerpt.length < 40) continue; // too little context — likely a TOC line

    const verseRangeLabel = verseEnd ? `${verseStart}-${verseEnd}` : `${verseStart}`;
    const targetVerseId = `${config.verseTranslationPrefix}:${bookSlug}.${chapterNumber}.${verseStart}`;

    entryCounter += 1;
    entries.push({
      id: `azkoul-${entryCounter.toString().padStart(4, "0")}`,
      relation: "related-topic",
      targetVerseId,
      topicSlugs: [],
      personId: PERSON_ID,
      workId: WORK_ID,
      title: `On ${rawBook} ${chapterNumber}:${verseRangeLabel}`,
      excerpt,
      takeaway: "",
      sourceId: SOURCE_ID,
      rank: 50,
      tags: ["azkoul", "treatise"],
    });
  }

  return {
    version: "1",
    person: buildPerson(),
    work: buildWork(),
    source: buildSource(),
    entries,
  };
}

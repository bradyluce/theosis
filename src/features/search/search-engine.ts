import Fuse from "fuse.js";
import type { SearchIntent, SearchResult } from "@/domain/search/types";
import {
  getAllDailyCommemorations,
  getAllPeople,
  getAllTopics,
  getAllWorks,
  getAvailableTranslations,
  getChapterSummary,
  getCrossReferencesForVerse,
  getDirectCommentaryForVerse,
  getPrimaryTranslation,
  getRelatedEntriesForVerse,
  getSourceById,
  getVerseById,
  getWorkById,
} from "@/lib/content";
import { bibleVerses } from "@/lib/content/seed/scripture";
import { parseReferenceQuery } from "@/features/search/reference-parser";
import librarySearchData from "../../../content/normalized/search/library.json" with { type: "json" };

type LibrarySearchEntry = {
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

const libraryChapters = (
  librarySearchData as { version: string; entries: LibrarySearchEntry[] }
).entries;

type SearchDocument = {
  id: string;
  kind: SearchResult["kind"];
  title: string;
  href: string;
  kicker: string;
  snippet: string;
  baseWeight: number;
  searchText: string;
};

const primaryTranslation = getPrimaryTranslation();
const translations = getAvailableTranslations();
const people = getAllPeople();
const works = getAllWorks();
const topics = getAllTopics();
const dailies = getAllDailyCommemorations();
const primaryVerses = bibleVerses.filter(
  (verse) => verse.translationId === primaryTranslation.id,
);

const verseDocuments: SearchDocument[] = primaryVerses.map((verse) => ({
  id: `verse-${verse.id}`,
  kind: "verse",
  title: verse.referenceLabel,
  href: `/bible/${verse.translationId}/${verse.bookSlug}/${verse.chapterNumber}#${verse.id}`,
  kicker: primaryTranslation.abbreviation,
  snippet: verse.text,
  baseWeight: 72,
  searchText: `${verse.referenceLabel} ${verse.text} ${verse.emphasisLabel ?? ""}`,
}));

const commentaryDocuments: SearchDocument[] = [];

const commentaryIndexDocuments: SearchDocument[] = [
  ...primaryVerses.flatMap((verse) => {
    const direct = getDirectCommentaryForVerse(verse.id).map((entry) => {
      const work = getWorkById(entry.workId);
      const source = getSourceById(entry.sourceId);

      return {
        id: `commentary-${entry.id}`,
        kind: "commentary" as const,
        title: entry.title,
        href: `/bible/${verse.translationId}/${verse.bookSlug}/${verse.chapterNumber}#${verse.id}`,
        kicker: "Direct commentary",
        snippet: entry.excerpt,
        baseWeight: 96,
        searchText: `${entry.title} ${entry.excerpt} ${entry.takeaway} ${
          work?.title ?? ""
        } ${source?.collection ?? ""}`,
      };
    });

    const related = getRelatedEntriesForVerse(verse.id).map((entry) => {
      const work = getWorkById(entry.workId);
      const source = getSourceById(entry.sourceId);

      return {
        id: `commentary-${entry.id}`,
        kind: "commentary" as const,
        title: entry.title,
        href: `/bible/${verse.translationId}/${verse.bookSlug}/${verse.chapterNumber}#${verse.id}`,
        kicker: "Related writing",
        snippet: entry.excerpt,
        baseWeight: 78,
        searchText: `${entry.title} ${entry.excerpt} ${entry.takeaway} ${
          work?.title ?? ""
        } ${source?.collection ?? ""}`,
      };
    });

    return [...direct, ...related];
  }),
];

const personDocuments: SearchDocument[] = people.map((person) => ({
  id: `person-${person.id}`,
  kind: "person",
  title: person.honorific ? `${person.honorific} ${person.name}` : person.name,
  href: `/library/people/${person.slug}`,
  kicker: person.kind,
  snippet: person.summary,
  baseWeight: 70,
  searchText: `${person.name} ${person.summary} ${person.eraLabel} ${person.topicSlugs.join(" ")}`,
}));

// Fold every chapter's excerpt + label + title into its parent Work's
// searchText, so a keyword that appears inside (say) Confessions Book VIII
// still surfaces Confessions as a single result. Previously each chapter
// was indexed as its own SearchDocument, which made a search for
// "confessions" return 13 stacked "Books" — confusing because the user
// wants one Confessions entry that opens the TOC.
const chapterTextByWorkId = new Map<string, string>();
for (const entry of libraryChapters) {
  const prior = chapterTextByWorkId.get(entry.workId) ?? "";
  chapterTextByWorkId.set(
    entry.workId,
    `${prior} ${entry.chapterLabel} ${entry.chapterTitle} ${entry.excerpt}`,
  );
}

const workDocuments: SearchDocument[] = works.map((work) => {
  const author = people.find((person) => person.id === work.personId);
  const source = getSourceById(work.sourceId);
  const chapterText = chapterTextByWorkId.get(work.id) ?? "";

  return {
    id: `work-${work.id}`,
    kind: "work" as const,
    title: work.title,
    href: `/library/works/${work.slug}`,
    kicker: work.workType,
    snippet: `${author?.name ?? "Unknown author"} / ${source?.collection ?? "Seeded source"}`,
    baseWeight: 66,
    searchText: `${work.title} ${work.summary} ${author?.name ?? ""} ${
      source?.collection ?? ""
    } ${work.topicSlugs.join(" ")} ${chapterText}`,
  };
});

const topicDocuments: SearchDocument[] = topics.map((topic) => ({
  id: `topic-${topic.slug}`,
  kind: "topic",
  title: topic.label,
  href: `/library#topic-${topic.slug}`,
  kicker: "Topic",
  snippet: topic.summary,
  baseWeight: 58,
  searchText: `${topic.label} ${topic.summary}`,
}));

const dailyDocuments: SearchDocument[] = dailies.map((daily) => ({
  id: `daily-${daily.id}`,
  kind: "daily",
  title: daily.title,
  href: "/daily",
  kicker: "Daily",
  snippet: daily.summary,
  baseWeight: 54,
  searchText: `${daily.title} ${daily.summary}`,
}));

// Per-chapter documents were dropped — their text is now folded into
// each parent Work's searchText (see chapterTextByWorkId above). Each
// Work surfaces as a single search result regardless of how many
// chapters/books it has.

const documents = [
  ...verseDocuments,
  ...commentaryDocuments,
  ...commentaryIndexDocuments,
  ...personDocuments,
  ...workDocuments,
  ...topicDocuments,
  ...dailyDocuments,
];

const fuse = new Fuse(documents, {
  includeScore: true,
  ignoreLocation: true,
  threshold: 0.38,
  keys: [
    { name: "title", weight: 0.35 },
    { name: "searchText", weight: 0.65 },
  ],
});

function createReferenceResults(intent: Extract<SearchIntent, { kind: "reference" }>) {
  const verseId = `${primaryTranslation.id}:${intent.reference.bookSlug}.${intent.reference.chapterNumber}.${intent.reference.verseStart}`;
  const verse = getVerseById(verseId);

  if (!verse) {
    return [];
  }

  const directCommentary = getDirectCommentaryForVerse(verse.id).map((entry) => ({
    id: `commentary-${entry.id}`,
    kind: "commentary" as const,
    title: entry.title,
    href: `/bible/${verse.translationId}/${verse.bookSlug}/${verse.chapterNumber}#${verse.id}`,
    kicker: "Direct commentary",
    snippet: entry.excerpt,
    highlightTerms: [],
    weight: 190 - entry.rank / 10,
  }));

  const relatedEntries = getRelatedEntriesForVerse(verse.id).map((entry) => ({
    id: `commentary-${entry.id}`,
    kind: "commentary" as const,
    title: entry.title,
    href: `/bible/${verse.translationId}/${verse.bookSlug}/${verse.chapterNumber}#${verse.id}`,
    kicker: "Related writing",
    snippet: entry.excerpt,
    highlightTerms: [],
    weight: 160 - entry.rank / 10,
  }));

  const crossReferenceResults = getCrossReferencesForVerse(verse.id)
    .filter((entry) =>
      Boolean(getChapterSummary(primaryTranslation.id, entry.target.bookSlug, entry.target.chapterNumber)),
    )
    .map((entry) => ({
      id: `xref-${entry.id}`,
      kind: "verse" as const,
      title: entry.target.label,
      href: `/bible/${primaryTranslation.id}/${entry.target.bookSlug}/${entry.target.chapterNumber}`,
      kicker: "Cross reference",
      snippet: entry.note,
      highlightTerms: [],
      weight: 135,
    }));

  const witnessCount = translations.filter(
    (translation) =>
      Boolean(
        getVerseById(
          `${translation.id}:${intent.reference.bookSlug}.${intent.reference.chapterNumber}.${intent.reference.verseStart}`,
        ),
      ),
  ).length;

  return [
    {
      id: `verse-${verse.id}`,
      kind: "verse" as const,
      title: verse.referenceLabel,
      href: `/bible/${verse.translationId}/${verse.bookSlug}/${verse.chapterNumber}#${verse.id}`,
      kicker: `Verse / ${witnessCount} witnesses`,
      snippet: verse.text,
      highlightTerms: [],
      weight: 220,
    },
    ...directCommentary,
    ...relatedEntries,
    ...crossReferenceResults,
  ];
}

export function searchTheosis(query: string): {
  intent: SearchIntent;
  results: SearchResult[];
} {
  const trimmedQuery = query.trim();
  const normalizedQuery = trimmedQuery.toLowerCase();
  const highlightTerms = normalizedQuery.split(/\s+/).filter(Boolean);
  const referenceIntent = parseReferenceQuery(trimmedQuery);
  const intent: SearchIntent =
    referenceIntent ?? {
      kind: "keyword",
      rawQuery: trimmedQuery,
      normalizedQuery,
    };

  if (!trimmedQuery) {
    return { intent, results: [] };
  }

  const resultMap = new Map<string, SearchResult>();

  if (referenceIntent) {
    for (const result of createReferenceResults(referenceIntent)) {
      resultMap.set(result.id, result);
    }
  }

  for (const match of fuse.search(trimmedQuery, { limit: 12 })) {
    const document = match.item;
    const score = typeof match.score === "number" ? 1 - match.score : 0.5;
    const weightedResult: SearchResult = {
      id: document.id,
      kind: document.kind,
      title: document.title,
      href: document.href,
      kicker: document.kicker,
      snippet: document.snippet,
      highlightTerms,
      weight: document.baseWeight + score * 30,
    };

    if (!resultMap.has(weightedResult.id)) {
      resultMap.set(weightedResult.id, weightedResult);
    }
  }

  return {
    intent,
    results: Array.from(resultMap.values()).sort((left, right) => right.weight - left.weight),
  };
}

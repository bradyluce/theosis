import type {
  BibleBook,
  BibleChapter,
  BibleTranslation,
  BibleVerse,
  CrossReference,
} from "@/domain/content/types";
import {
  getChapterCommentary,
  getCrossReferencesForVerse,
  getDirectCommentaryForVerse,
  getPersonById,
  getRelatedEntriesForVerse,
  getSourceById,
  getVerseComparisons,
  getWorkById,
} from "@/lib/content";

export type ReaderCommentaryCard = {
  id: string;
  title: string;
  excerpt: string;
  takeaway: string;
  personName: string;
  personSlug: string;
  workTitle: string;
  workSlug: string;
  sourceLabel: string;
};

export type ReaderWitness = {
  id: string;
  translationId: string;
  label: string;
  caption: string;
  kind: BibleTranslation["kind"];
  direction: BibleTranslation["direction"];
  text: string;
};

export type ReaderCrossReference = CrossReference & {
  href: string;
};

export type ReaderVerseCard = {
  verse: BibleVerse;
  hasDirectCommentary: boolean;
  hasRelatedEntries: boolean;
  hasCrossReferences: boolean;
  witnesses: ReaderWitness[];
  directCommentary: ReaderCommentaryCard[];
  relatedEntries: ReaderCommentaryCard[];
  crossReferences: ReaderCrossReference[];
};

export type ReaderModel = {
  translation: BibleTranslation;
  book: BibleBook;
  chapter: BibleChapter;
  chapterLabel: string;
  chapterCommentary: ReaderCommentaryCard[];
  availableTranslations: Array<{
    slug: string;
    label: string;
    caption: string;
    href: string;
  }>;
  verses: ReaderVerseCard[];
};

function resolveCommentaryCards(entries: ReturnType<typeof getDirectCommentaryForVerse>) {
  return entries.map((entry) => {
    const person = getPersonById(entry.personId);
    const work = getWorkById(entry.workId);
    const source = getSourceById(entry.sourceId);

    return {
      id: entry.id,
      title: entry.title,
      excerpt: entry.excerpt,
      takeaway: entry.takeaway,
      personName: person?.name ?? "Unknown source",
      personSlug: person?.slug ?? "",
      workTitle: work?.title ?? "Unknown work",
      workSlug: work?.slug ?? "",
      sourceLabel: source?.collection ?? "Seeded source",
    };
  });
}

function resolveWitnesses(
  translation: BibleTranslation,
  verse: BibleVerse,
  allTranslations: BibleTranslation[],
): ReaderWitness[] {
  return getVerseComparisons(
    verse.bookSlug,
    verse.chapterNumber,
    verse.verseNumber,
  )
    .filter((item) => item.translationId !== translation.id)
    .map((item) => {
      const witnessTranslation = allTranslations.find(
        (candidate) => candidate.id === item.translationId,
      );

      return {
        id: item.id,
        translationId: item.translationId,
        label: witnessTranslation?.abbreviation ?? item.translationId.toUpperCase(),
        caption:
          witnessTranslation?.kind === "original"
            ? witnessTranslation.scriptLabel
            : (witnessTranslation?.name ?? "Comparison"),
        kind: witnessTranslation?.kind ?? "translation",
        direction: witnessTranslation?.direction ?? "ltr",
        text: item.text,
      };
    });
}

function resolveCrossReferences(
  verseId: string,
  translationSlug: string,
): ReaderCrossReference[] {
  return getCrossReferencesForVerse(verseId).map((entry) => ({
    ...entry,
    href: `/bible/${translationSlug}/${entry.target.bookSlug}/${entry.target.chapterNumber}`,
  }));
}

export type BibleChapterData = {
  translation: BibleTranslation;
  book: BibleBook;
  chapter: BibleChapter;
  verses: BibleVerse[];
  allTranslations: BibleTranslation[];
};

export function buildReaderModel(data: BibleChapterData): ReaderModel {
  const { translation, book, chapter, verses, allTranslations } = data;

  const availableTranslations = allTranslations.map((candidate) => ({
    slug: candidate.slug,
    label: candidate.abbreviation,
    caption: candidate.kind === "original" ? candidate.scriptLabel : "Reader",
    href: `/bible/${candidate.slug}/${book.slug}/${chapter.chapterNumber}`,
  }));

  const verseCards: ReaderVerseCard[] = verses.map((verse) => {
    const directCommentary = resolveCommentaryCards(getDirectCommentaryForVerse(verse.id));
    const relatedEntries = resolveCommentaryCards(getRelatedEntriesForVerse(verse.id));
    const crossReferences = resolveCrossReferences(verse.id, translation.slug);

    return {
      verse,
      hasDirectCommentary: directCommentary.length > 0,
      hasRelatedEntries: relatedEntries.length > 0,
      hasCrossReferences: crossReferences.length > 0,
      witnesses: resolveWitnesses(translation, verse, allTranslations),
      directCommentary,
      relatedEntries,
      crossReferences,
    };
  });

  const chapterCommentary = resolveCommentaryCards(
    getChapterCommentary(book.slug, chapter.chapterNumber),
  );

  return {
    translation,
    book,
    chapter,
    chapterLabel: `${book.name} ${chapter.chapterNumber}`,
    chapterCommentary,
    availableTranslations,
    verses: verseCards,
  };
}

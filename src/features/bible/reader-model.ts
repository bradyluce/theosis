import type {
  BibleBook,
  BibleChapter,
  BibleTranslation,
  BibleVerse,
  CrossReference,
} from "@/domain/content/types";
import {
  getAvailableTranslations,
  getBookBySlug,
  getChapterCommentary,
  getChapterSummary,
  getChapterVerses,
  getCrossReferencesForVerse,
  getDirectCommentaryForVerse,
  getPersonById,
  getRelatedEntriesForVerse,
  getSourceById,
  getTranslationBySlug,
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

export type ReaderJumpLink = {
  label: string;
  description: string;
  href: string;
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
  availablePassages: ReaderJumpLink[];
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
): ReaderWitness[] {
  return getVerseComparisons(
    verse.bookSlug,
    verse.chapterNumber,
    verse.verseNumber,
  )
    .filter((item) => item.translationId !== translation.id)
    .map((item) => {
      const witnessTranslation = getAvailableTranslations().find(
        (candidate) => candidate.id === item.translationId,
      );

      return {
        id: item.id,
        translationId: item.translationId,
        label: witnessTranslation?.abbreviation ?? item.translationId.toUpperCase(),
        caption: witnessTranslation?.kind === "original"
          ? witnessTranslation.scriptLabel
          : witnessTranslation?.name ?? "Comparison",
        kind: witnessTranslation?.kind ?? "translation",
        direction: witnessTranslation?.direction ?? "ltr",
        text: item.text,
      };
    });
}

function resolveCrossReferences(verseId: string): ReaderCrossReference[] {
  return getCrossReferencesForVerse(verseId).map((entry) => ({
    ...entry,
    href: `/bible/osb/${entry.target.bookSlug}/${entry.target.chapterNumber}`,
  }));
}

function getPassageLinks(): ReaderJumpLink[] {
  return [
    {
      label: "John 1",
      description: "The eternal Word and the Incarnation.",
      href: "/bible/osb/john/1",
    },
    {
      label: "Genesis 1",
      description: "Creation, light, and the beginning.",
      href: "/bible/osb/genesis/1",
    },
    {
      label: "2 Peter 1",
      description: "Partakers of the divine nature.",
      href: "/bible/osb/second-peter/1",
    },
    {
      label: "Wisdom 7",
      description: "Wisdom imagery and divine light.",
      href: "/bible/osb/wisdom/7",
    },
  ];
}

export function buildReaderModel(
  translationSlug: string,
  bookSlug: string,
  chapterNumber: number,
): ReaderModel | null {
  const translation = getTranslationBySlug(translationSlug);
  const book = getBookBySlug(bookSlug);

  if (!translation || !book) {
    return null;
  }

  const chapter = getChapterSummary(translation.id, book.slug, chapterNumber);
  const verses = getChapterVerses(translation.id, book.slug, chapterNumber);

  if (!chapter || verses.length === 0) {
    return null;
  }

  const availableTranslations = getAvailableTranslations()
    .filter((candidate) =>
      Boolean(getChapterSummary(candidate.id, book.slug, chapterNumber)),
    )
    .map((candidate) => ({
      slug: candidate.slug,
      label: candidate.abbreviation,
      caption: candidate.kind === "original" ? candidate.scriptLabel : "Reader",
      href: `/bible/${candidate.slug}/${book.slug}/${chapterNumber}`,
    }));

  const verseCards: ReaderVerseCard[] = verses.map((verse) => {
    const directCommentary = resolveCommentaryCards(
      getDirectCommentaryForVerse(verse.id),
    );
    const relatedEntries = resolveCommentaryCards(getRelatedEntriesForVerse(verse.id));
    const crossReferences = resolveCrossReferences(verse.id);

    return {
      verse,
      hasDirectCommentary: directCommentary.length > 0,
      hasRelatedEntries: relatedEntries.length > 0,
      hasCrossReferences: crossReferences.length > 0,
      witnesses: resolveWitnesses(translation, verse),
      directCommentary,
      relatedEntries,
      crossReferences,
    };
  });

  const chapterCommentary = resolveCommentaryCards(
    getChapterCommentary(book.slug, chapterNumber),
  );

  return {
    translation,
    book,
    chapter,
    chapterLabel: `${book.name} ${chapterNumber}`,
    chapterCommentary,
    availableTranslations,
    availablePassages: getPassageLinks(),
    verses: verseCards,
  };
}

import type {
  BibleBook,
  BibleChapter,
  BibleTranslation,
  BibleVerse,
  CommentaryEntry,
  CrossReference,
  Person,
  SourceRecord,
  Work,
} from "@/domain/content/types";
import { getCrossReferencesForVerse, getVerseComparisons } from "@/lib/content";

export type ChapterCommentaryView = {
  directByLocation: Map<string, CommentaryEntry[]>;
  relatedByLocation: Map<string, CommentaryEntry[]>;
  chapterLevel: CommentaryEntry[];
  personById: Map<string, Person>;
  workById: Map<string, Work>;
  sourceById: Map<string, SourceRecord>;
};

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

function resolveCommentaryCards(
  entries: CommentaryEntry[],
  view: ChapterCommentaryView,
): ReaderCommentaryCard[] {
  return entries.map((entry) => {
    const person = view.personById.get(entry.personId);
    const work = view.workById.get(entry.workId);
    const source = view.sourceById.get(entry.sourceId);

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

function verseLocationKey(bookSlug: string, chapterNumber: number, verseNumber: number) {
  return `${bookSlug}.${chapterNumber}.${verseNumber}`;
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
  commentary: ChapterCommentaryView;
};

export function buildReaderModel(data: BibleChapterData): ReaderModel {
  const { translation, book, chapter, verses, allTranslations, commentary } = data;

  const availableTranslations = allTranslations.map((candidate) => ({
    slug: candidate.slug,
    label: candidate.abbreviation,
    caption: candidate.kind === "original" ? candidate.scriptLabel : "Reader",
    href: `/bible/${candidate.slug}/${book.slug}/${chapter.chapterNumber}`,
  }));

  const verseCards: ReaderVerseCard[] = verses.map((verse) => {
    const location = verseLocationKey(verse.bookSlug, verse.chapterNumber, verse.verseNumber);
    const directCommentary = resolveCommentaryCards(
      commentary.directByLocation.get(location) ?? [],
      commentary,
    );
    const relatedEntries = resolveCommentaryCards(
      commentary.relatedByLocation.get(location) ?? [],
      commentary,
    );
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

  const chapterCommentary = resolveCommentaryCards(commentary.chapterLevel, commentary);

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

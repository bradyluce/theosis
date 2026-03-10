import type { ScriptureReference } from "@/domain/content/types";

export function createVerseId(
  translationId: string,
  bookSlug: string,
  chapterNumber: number,
  verseNumber: number,
) {
  return `${translationId}:${bookSlug}.${chapterNumber}.${verseNumber}`;
}

export function createChapterId(bookSlug: string, chapterNumber: number) {
  return `${bookSlug}.${chapterNumber}`;
}

export function createReference(
  bookSlug: string,
  bookName: string,
  chapterNumber: number,
  verseStart: number,
  verseEnd?: number,
): ScriptureReference {
  const verseRange =
    verseEnd && verseEnd !== verseStart
      ? `${verseStart}-${verseEnd}`
      : `${verseStart}`;

  return {
    bookSlug,
    bookName,
    chapterNumber,
    verseStart,
    verseEnd,
    label: `${bookName} ${chapterNumber}:${verseRange}`,
  };
}

import type { ScriptureReference } from "@theosis/core";

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

// Strip the "<translationId>:" prefix from a targetVerseId so the trailing
// "<bookSlug>.<chapter>.<verse>" location is translation-agnostic. Used by the
// commentary loader to surface entries across translations, and by the
// normalize step to bucket entries into per-verse files. If the id has no
// colon it's returned unchanged.
export function verseLocationKey(verseId: string): string {
  const colonIndex = verseId.indexOf(":");
  return colonIndex === -1 ? verseId : verseId.slice(colonIndex + 1);
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

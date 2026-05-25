import type { ScriptureReference } from "@theosis/core";

// Build a bible-reader URL for an appointed reading. The `?highlight=`
// query param drives the verse glow + auto-scroll in BibleReaderExperience.
export function buildReadingHref(
  translationSlug: string,
  scripture: ScriptureReference,
): string {
  const { bookSlug, chapterNumber, verseStart, verseEnd } = scripture;
  const range =
    verseEnd && verseEnd !== verseStart
      ? `${verseStart}-${verseEnd}`
      : `${verseStart}`;
  return `/bible/${translationSlug}/${bookSlug}/${chapterNumber}?highlight=${range}`;
}

// Parse a `highlight` query param like "3" or "3-12" into a numeric range.
// Returns null for missing or malformed input.
export function parseHighlightParam(
  raw: string | string[] | undefined,
): { start: number; end: number } | null {
  if (!raw || Array.isArray(raw)) return null;
  const match = /^(\d+)(?:-(\d+))?$/.exec(raw);
  if (!match) return null;
  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : start;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return null;
  }
  return { start, end };
}

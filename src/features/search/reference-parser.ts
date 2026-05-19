import type { SearchIntent } from "@/domain/search/types";
import { getReferenceBookAliases, normalizeCanonAlias } from "@/lib/content/book-canon";
import { createReference } from "@/lib/content/reference";

const canonAliases = getReferenceBookAliases();

export function parseReferenceQuery(
  query: string,
): Extract<SearchIntent, { kind: "reference" }> | null {
  const normalizedQuery = query.trim().toLowerCase().replace(/\./g, "");
  const match = normalizedQuery.match(
    /^((?:[1-3]\s*)?[a-z\s]+?)\s+(\d+):(\d+)(?:-(\d+))?$/,
  );

  if (!match) {
    return null;
  }

  const [, bookGroup, chapterGroup, verseStartGroup, verseEndGroup] = match;
  const normalizedBook = normalizeCanonAlias(bookGroup);
  const book = canonAliases.find((candidate) =>
    candidate.aliases.includes(normalizedBook),
  );

  if (!book) {
    return null;
  }

  const chapterNumber = Number.parseInt(chapterGroup, 10);
  const verseStart = Number.parseInt(verseStartGroup, 10);
  const verseEnd = verseEndGroup
    ? Number.parseInt(verseEndGroup, 10)
    : undefined;

  return {
    kind: "reference",
    rawQuery: query,
    normalizedQuery,
    reference: createReference(
      book.slug,
      book.name,
      chapterNumber,
      verseStart,
      verseEnd,
    ),
  };
}

import type { SearchIntent } from "@/domain/search/types";
import { createReference } from "@/lib/content/reference";

const bookAliases = [
  {
    slug: "genesis",
    name: "Genesis",
    aliases: ["genesis", "gen", "gn"],
  },
  {
    slug: "john",
    name: "John",
    aliases: ["john", "jn", "jhn"],
  },
  {
    slug: "second-peter",
    name: "2 Peter",
    aliases: ["2 peter", "ii peter", "second peter", "2 pet", "2pet", "ii pet"],
  },
  {
    slug: "wisdom",
    name: "Wisdom of Solomon",
    aliases: ["wisdom", "wis", "wisdom of solomon"],
  },
];

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
  const normalizedBook = bookGroup.replace(/\s+/g, " ").trim();
  const book = bookAliases.find((candidate) =>
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

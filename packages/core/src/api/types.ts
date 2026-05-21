// File and response shapes for the Theosis content API. Mirror the actual
// JSON returned by src/app/api/* routes and the on-disk normalized files.
// These types live in @theosis/core because both the web app (server-side
// loader) and the mobile app (HTTP client) need them.

import type {
  CommentaryEntry,
  Person,
  SourceRecord,
  Work,
  WorkChapter,
} from "../domain/types";

// --- Catalog shapes --------------------------------------------------------

export type CommentaryCatalog = {
  version: "1";
  people: Person[];
  works: Work[];
  sources: SourceRecord[];
  index: {
    // bookSlug → chapterNumber (string) → verseNumber[]. Tells the client
    // which verses actually have entries; saves a round-trip on empties.
    byVerse: Record<string, Record<string, number[]>>;
    // bookSlug → chapterNumber[]. Same idea for chapter-level commentary.
    byChapter: Record<string, number[]>;
  };
};

export type LibraryCatalog = {
  version: "1";
  people: Person[];
  works: Work[];
  sources: SourceRecord[];
  index: {
    // workId → chapter metadata. `orders` is the parallel array clients
    // iterate to fetch /api/library/by-work/<workId>/<order>; orders aren't
    // always 1..N (ecumenical-council works pin their lone chapter at the
    // council's ordinal).
    byWork: Record<
      string,
      { chapterCount: number; chapterIds: string[]; orders: number[] }
    >;
  };
};

// --- Per-section file shapes ----------------------------------------------

export type ByVerseFile = {
  bookSlug: string;
  chapterNumber: number;
  verseNumber: number;
  entries: CommentaryEntry[];
};

export type ByChapterFile = {
  bookSlug: string;
  chapterNumber: number;
  entries: CommentaryEntry[];
};

export type ByWorkFile = {
  chapter: WorkChapter;
};

// --- /api/version ----------------------------------------------------------

export type VersionResponse = {
  commit: string;
  branch: string;
  environment: string;
};

// File and response shapes for the Theosis content API. Mirror the actual
// JSON returned by src/app/api/* routes and the on-disk normalized files.
// These types live in @theosis/core because both the web app (server-side
// loader) and the mobile app (HTTP client) need them.

import type {
  BibleChapter,
  BibleVerse,
  CommentaryEntry,
  DailyCommemoration,
  HymnText,
  IconRef,
  Person,
  ReadingAssignment,
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

// --- /api/bible/[translation]/[book]/[chapter] -----------------------------

export type BibleChapterFile = {
  chapter: BibleChapter;
  verses: BibleVerse[];
};

// --- /api/library/people ---------------------------------------------------

// One Person enriched with their resolved icon (absolute URL, suitable for
// direct fetch from a mobile client). `icon` is null when no icon is
// catalogued for this person.
export type LibraryPerson = Person & { icon: IconRef | null };

export type LibraryPeopleResponse = {
  people: LibraryPerson[];
};

// --- /api/daily ------------------------------------------------------------

// Pre-composed snapshot of the daily commemoration for the mobile app —
// bundles getDailyCommemoration + getPeopleByIds + getDailyReadings +
// getDailyHymns + icon resolution into one response. `primaryIcon` and
// `saintIcons[*]` are null when no icon is available.
export type DailyResponse = {
  daily: DailyCommemoration;
  saints: Person[];
  readings: ReadingAssignment[];
  hymns: HymnText[];
  translationSlug: string;
  primaryIcon: IconRef | null;
  saintIcons: Record<string, IconRef | null>;
};

// --- /api/version ----------------------------------------------------------

export type VersionResponse = {
  commit: string;
  branch: string;
  environment: string;
};

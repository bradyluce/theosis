// File and response shapes for the Theosis content API. Mirror the actual
// JSON returned by src/app/api/* routes and the on-disk normalized files.
// These types live in @theosis/core because both the web app (server-side
// loader) and the mobile app (HTTP client) need them.

import type {
  BibleBook,
  BibleChapter,
  BibleTranslation,
  BibleVerse,
  CommentaryEntry,
  DailyCommemoration,
  DailyCommemorationItem,
  HymnText,
  IconRef,
  OrthodoxGuide,
  Parish,
  ParishCatalogEntry,
  Person,
  ReadingAssignment,
  ScriptureReference,
  SourceRecord,
  TopicPage,
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

// Chapter summary — every WorkChapter field except `sections`. Used by
// the work-detail screen's table of contents so a 13-book work doesn't
// download all 500 KB of prose just to render a list of titles.
export type WorkChapterSummary = Omit<WorkChapter, "sections">;

export type WorkChaptersResponse = {
  chapters: WorkChapterSummary[];
};

// --- /api/bible/catalog ----------------------------------------------------

export type BibleCatalog = {
  translations: BibleTranslation[];
  books: BibleBook[];
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

// --- /api/search -----------------------------------------------------------

export type SearchResultKind =
  | "verse"
  | "commentary"
  | "work"
  | "person"
  | "topic"
  | "daily";

export type SearchResult = {
  id: string;
  kind: SearchResultKind;
  title: string;
  // Web-app href. Mobile parses this to derive its own navigation
  // (e.g. /library/people/<slug> → router.push(`/people/${slug}`)).
  href: string;
  kicker: string;
  snippet: string;
  highlightTerms: string[];
  weight: number;
};

export type SearchIntent =
  | {
      kind: "reference";
      rawQuery: string;
      normalizedQuery: string;
      reference: ScriptureReference;
    }
  | {
      kind: "keyword";
      rawQuery: string;
      normalizedQuery: string;
    };

export type SearchResponse = {
  intent: SearchIntent | null;
  results: SearchResult[];
};

// --- /api/topics -----------------------------------------------------------

// Lightweight summary used by the topics index. Excludes the full body and
// curated lists so the index payload stays small.
export type TopicSummary = {
  slug: string;
  label: string;
  subtitle?: string;
  summary: string;
};

export type TopicsResponse = {
  topics: TopicSummary[];
};

// /api/topics/[slug] — full page, plus enriched Fathers/Works/saints so the
// client doesn't need to round-trip the library catalog to render each chip.
export type TopicPageResponse = {
  topic: TopicPage;
  fathers: Array<Person & { icon: IconRef | null }>;
  // Curated works are looked up against the library catalog. When a slug
  // doesn't resolve (work hasn't been ingested yet), it's silently dropped.
  works: Work[];
  saints: Array<Person & { icon: IconRef | null }>;
};

// --- /api/guides -----------------------------------------------------------

export type GuideSummary = {
  slug: string;
  category: OrthodoxGuide["category"];
  title: string;
  summary: string;
  readMinutes: number;
};

export type GuidesResponse = {
  guides: GuideSummary[];
};

export type GuidePageResponse = {
  guide: OrthodoxGuide;
};

// --- /api/calendar/menaion-month/[month] -----------------------------------

// One canonical Menaion entry for the saints-by-day calendar surface.
// `monthDay` is the MM-DD key used in content/normalized/calendar/menaion.json.
export type MenaionDay = {
  monthDay: string;
  title: string;
  summary: string;
  // Lead saint IDs (when their Person records exist in seed).
  saintIds: string[];
  // Co-commemorations.
  also: DailyCommemorationItem[];
};

export type MenaionMonthResponse = {
  // 1-12 — the calendar month this response covers.
  month: number;
  days: MenaionDay[];
};

// --- /api/parishes/near ----------------------------------------------------

export type NearbyParish = ParishCatalogEntry & { distanceMi: number };

export type ParishesNearResponse = {
  origin: { lat: number; lng: number };
  radiusMi: number;
  count: number;
  parishes: NearbyParish[];
};

// --- /api/parishes/[state]/[slug] ------------------------------------------

export type ParishDetailResponse = Parish;

// --- /api/parishes/geocode -------------------------------------------------

export type GeocodeResponse = {
  lat: number;
  lng: number;
  // Human-readable result string from the geocoder, e.g.
  // "10001, Manhattan, New York County, New York, United States".
  label: string;
};

// --- /api/version ----------------------------------------------------------

export type VersionResponse = {
  commit: string;
  branch: string;
  environment: string;
};

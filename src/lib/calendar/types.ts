// Calendar-internal types. These describe the shape of the normalized JSON
// data on disk (Menaion + movable cycle) and the inputs/outputs of the composer.
// They are deliberately kept out of `@theosis/core` (packages/core) because
// they describe the storage layer, not the app-facing record. The composer
// translates these into the existing `DailyCommemoration` shape.

export type Jurisdiction = "oca" | "goarch" | "antiochian" | "rocor" | "moscow";
export type CalendarSystem = "new" | "old";

// A single saint or feast commemorated on a day. Multiple Commemoration records
// can sit alongside one another in the `also` list of a MenaionEntry — Orthodox
// tradition commemorates many saints on most days; this lets the Daily page
// surface every one of them, with optional links to library Person records.
export type Commemoration = {
  name: string;
  // Optional short summary; primary entries always have one (in MenaionEntry.summary)
  // but co-commemorations can be name-only.
  summary?: string;
  // Optional link to a Person record (drives clickable saint cards).
  saintId?: string;
};

// One record per Julian month-day (e.g. "05-21" = Sts. Constantine and Helena).
// The Menaion is universal — New Calendar jurisdictions observe the same entries
// on their corresponding Gregorian day. Storage key = canonical Menaion MM-DD.
export type MenaionEntry = {
  monthDay: string; // "MM-DD"
  title: string;
  summary: string;
  // Additional saints/feasts commemorated alongside the primary on this day.
  // Was historically `also: string[]`; promoted to richer records so each can
  // optionally carry a saintId link and/or a short summary.
  also?: Commemoration[];
  // Optional feast classification — left soft until `Feast` becomes a first-class entity.
  feastRank?: "great" | "vigil" | "polyeleos" | "doxology" | "simple";
  // Ids of `Person` records (in src/lib/content/seed/library.ts) commemorated
  // on this day, including those threaded through `also`. Drives the saint-card
  // panel on the Daily page; empty/absent means the day's saints have no
  // library entries yet.
  saintIds?: string[];
};

// One record per paschal-cycle day. pdist is the integer day offset from Pascha:
// pdist=0 is Pascha itself, pdist=-7 is Palm Sunday, pdist=49 is Pentecost.
export type MovableCycleEntry = {
  pdist: number;
  title: string;
  summary: string;
  season?: "triodion" | "great-lent" | "holy-week" | "pascha" | "bright-week" | "pentecostarion";
  feastRank?: "great" | "vigil" | "polyeleos" | "doxology" | "simple";
  saintIds?: string[];
};

// One scriptural reading slot in the lectionary. Keeps book + chapter + verses
// as raw fields so the composer can build a ScriptureReference using the same
// helpers as the rest of the app (createReference).
export type LectionarySlot = {
  kind: "epistle" | "gospel" | "old-testament" | "prophecy";
  bookSlug: string;
  bookName: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
  label: string;
};

export type LectionaryData = {
  movable: Record<string, LectionarySlot[]>; // keyed by stringified pdist
  fixed: Record<string, LectionarySlot[]>; // keyed by "MM-DD"
};

// One hymn slot for a feast or saint. Tone + type + a single English text;
// translations are Theosis-owned originals.
export type HymnSlot = {
  type: "troparion" | "kontakion";
  tone: string;
  title: string;
  text: string;
};

export type HymnData = {
  movable: Record<string, HymnSlot[]>;
  fixed: Record<string, HymnSlot[]>;
};

export type CalendarData = {
  menaion: Record<string, MenaionEntry>; // keyed by "MM-DD"
  movableCycle: Record<string, MovableCycleEntry>; // keyed by stringified pdist
  lectionary: LectionaryData;
  hymns: HymnData;
};

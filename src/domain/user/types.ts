export type SavedVerse = {
  id: string;
  verseId: string;
  translationId: string;
  savedAt: string;
};

export type SavedHighlight = {
  id: string;
  targetType: "verse" | "commentary" | "work-section";
  targetId: string;
  colorLabel: "gold" | "sand" | "linen";
  excerpt: string;
  createdAt: string;
};

export type SavedNote = {
  id: string;
  targetType: "verse" | "chapter" | "work" | "person";
  targetId: string;
  title: string;
  body: string;
  updatedAt: string;
};

export type FavoritePerson = {
  id: string;
  personId: string;
  addedAt: string;
};

// A user-curated reading list entry. A `Work` lives in one of three buckets:
// "read-later" (queued), "reading" (currently in progress), or "read" (done).
// Status is moved by the user — there's no automatic completion logic yet.
export type ReadingListStatus = "read-later" | "reading" | "read";

export type ReadingListItem = {
  id: string;
  workId: string;
  status: ReadingListStatus;
  addedAt: string;
  // Updated whenever the status changes, so "Reading" can be sorted
  // most-recent-first without reaching back into addedAt.
  updatedAt: string;
};

export type SavedSearch = {
  id: string;
  query: string;
  savedAt: string;
};

export type ReadingHistoryEntry = {
  id: string;
  label: string;
  href: string;
  visitedAt: string;
};

export type ProfilePreferences = {
  calendarPreference: "new-calendar" | "old-calendar";
  primaryTranslationId: string;
  patronSaintPersonId: string;
  // Person ids whose commentary should always appear first in the reader,
  // in the order listed. Use the toggle-and-reorder actions on the study
  // store rather than editing this directly.
  preferredFatherIds: string[];
  // Person ids whose commentary should be hidden from the reader entirely.
  hiddenFatherIds: string[];
  // Free-text location displayed on the You tab ("Tyler", "Brooklyn", etc.).
  // Optional; the You tab renders nothing when empty.
  location?: string;
};

export type UserProfileSnapshot = {
  savedVerses: SavedVerse[];
  highlights: SavedHighlight[];
  notes: SavedNote[];
  favoritePeople: FavoritePerson[];
  recentSearches: SavedSearch[];
  readingHistory: ReadingHistoryEntry[];
  readingList: ReadingListItem[];
  preferences: ProfilePreferences;
};

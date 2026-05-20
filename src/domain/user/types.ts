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
};

export type UserProfileSnapshot = {
  savedVerses: SavedVerse[];
  highlights: SavedHighlight[];
  notes: SavedNote[];
  favoritePeople: FavoritePerson[];
  recentSearches: SavedSearch[];
  readingHistory: ReadingHistoryEntry[];
  preferences: ProfilePreferences;
};

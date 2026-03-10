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

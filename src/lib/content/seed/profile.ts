import type { UserProfileSnapshot } from "@/domain/user/types";
import { createVerseId } from "@/lib/content/reference";

export const userProfileSeed: UserProfileSnapshot = {
  savedVerses: [
    {
      id: "saved-john-1-14",
      verseId: createVerseId("kjva", "john", 1, 14),
      translationId: "kjva",
      savedAt: "2026-03-07T09:15:00.000Z",
    },
    {
      id: "saved-second-peter-1-4",
      verseId: createVerseId("kjva", "second-peter", 1, 4),
      translationId: "kjva",
      savedAt: "2026-03-08T20:45:00.000Z",
    },
  ],
  highlights: [
    {
      id: "highlight-palamas-theosis",
      targetType: "commentary",
      targetId: "related-palamas-second-peter-1-4",
      colorLabel: "gold",
      excerpt: "Participation is by grace, not by essence.",
      createdAt: "2026-03-08T20:47:00.000Z",
    },
  ],
  notes: [
    {
      id: "note-john-1-1",
      targetType: "verse",
      targetId: createVerseId("kjva", "john", 1, 1),
      title: "Beginning and eternity",
      body: "The opening refuses to let me reduce Christ to an inspired teacher. John starts where creation cannot reach.",
      updatedAt: "2026-03-08T21:00:00.000Z",
    },
  ],
  favoritePeople: [
    {
      id: "favorite-chrysostom",
      personId: "john-chrysostom",
      addedAt: "2026-03-06T13:30:00.000Z",
    },
    {
      id: "favorite-gregory-palamas",
      personId: "gregory-palamas",
      addedAt: "2026-03-08T20:30:00.000Z",
    },
  ],
  recentSearches: [
    {
      id: "search-john-1-1",
      query: "John 1:1",
      savedAt: "2026-03-09T07:30:00.000Z",
    },
    {
      id: "search-theosis",
      query: "theosis",
      savedAt: "2026-03-08T22:10:00.000Z",
    },
    {
      id: "search-gregory-palamas",
      query: "Gregory Palamas",
      savedAt: "2026-03-08T22:15:00.000Z",
    },
  ],
  readingHistory: [
    {
      id: "history-john-1",
      label: "John 1 in KJVA",
      href: "/bible/kjva/john/1",
      visitedAt: "2026-03-09T07:40:00.000Z",
    },
    {
      id: "history-forty-martyrs",
      label: "The Forty Martyrs of Sebaste",
      href: "/daily",
      visitedAt: "2026-03-09T08:00:00.000Z",
    },
  ],
  readingList: [],
  preferences: {
    calendarPreference: "new-calendar",
    primaryTranslationId: "kjva",
    patronSaintPersonId: "john-chrysostom",
    preferredFatherIds: [],
    hiddenFatherIds: [],
    location: "Tyler",
  },
};

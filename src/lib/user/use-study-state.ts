"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  FavoritePerson,
  ReadingHistoryEntry,
  SavedHighlight,
  SavedNote,
  SavedSearch,
  SavedVerse,
  UserProfileSnapshot,
} from "@/domain/user/types";
import { userProfileSeed } from "@/lib/content/seed/profile";

type StudyState = UserProfileSnapshot & {
  hasHydrated: boolean;
  toggleSavedVerse: (verseId: string, translationId: string) => void;
  toggleHighlight: (
    targetType: SavedHighlight["targetType"],
    targetId: string,
    excerpt: string,
  ) => void;
  upsertNote: (
    targetType: SavedNote["targetType"],
    targetId: string,
    title: string,
    body: string,
  ) => void;
  addRecentSearch: (query: string) => void;
  recordReadingHistory: (entry: Omit<ReadingHistoryEntry, "id" | "visitedAt">) => void;
  toggleFavoritePerson: (personId: string) => void;
};

function nextSavedVerse(verseId: string, translationId: string): SavedVerse {
  return {
    id: `saved-${verseId}`,
    verseId,
    translationId,
    savedAt: new Date().toISOString(),
  };
}

function nextHighlight(
  targetType: SavedHighlight["targetType"],
  targetId: string,
  excerpt: string,
): SavedHighlight {
  return {
    id: `highlight-${targetType}-${targetId}`,
    targetType,
    targetId,
    colorLabel: "gold",
    excerpt,
    createdAt: new Date().toISOString(),
  };
}

function nextFavorite(personId: string): FavoritePerson {
  return {
    id: `favorite-${personId}`,
    personId,
    addedAt: new Date().toISOString(),
  };
}

function nextSearch(query: string): SavedSearch {
  return {
    id: `search-${query.toLowerCase().replace(/\s+/g, "-")}`,
    query,
    savedAt: new Date().toISOString(),
  };
}

export const useStudyState = create<StudyState>()(
  persist(
    (set) => ({
      ...userProfileSeed,
      hasHydrated: false,
      toggleSavedVerse: (verseId, translationId) =>
        set((state) => {
          const exists = state.savedVerses.some((item) => item.verseId === verseId);

          return {
            savedVerses: exists
              ? state.savedVerses.filter((item) => item.verseId !== verseId)
              : [nextSavedVerse(verseId, translationId), ...state.savedVerses],
          };
        }),
      toggleHighlight: (targetType, targetId, excerpt) =>
        set((state) => {
          const exists = state.highlights.some(
            (item) => item.targetType === targetType && item.targetId === targetId,
          );

          return {
            highlights: exists
              ? state.highlights.filter(
                  (item) =>
                    !(item.targetType === targetType && item.targetId === targetId),
                )
              : [nextHighlight(targetType, targetId, excerpt), ...state.highlights],
          };
        }),
      upsertNote: (targetType, targetId, title, body) =>
        set((state) => {
          const existing = state.notes.find(
            (item) => item.targetType === targetType && item.targetId === targetId,
          );

          const nextNote: SavedNote = {
            id: existing?.id ?? `note-${targetType}-${targetId}`,
            targetType,
            targetId,
            title: title.trim() || "Study note",
            body,
            updatedAt: new Date().toISOString(),
          };

          return {
            notes: [
              nextNote,
              ...state.notes.filter((item) => item.id !== existing?.id),
            ],
          };
        }),
      addRecentSearch: (query) =>
        set((state) => {
          const nextEntry = nextSearch(query);

          return {
            recentSearches: [
              nextEntry,
              ...state.recentSearches.filter(
                (item) => item.query.toLowerCase() !== query.toLowerCase(),
              ),
            ].slice(0, 8),
          };
        }),
      recordReadingHistory: (entry) =>
        set((state) => {
          const nextEntry: ReadingHistoryEntry = {
            ...entry,
            id: `history-${entry.href}`,
            visitedAt: new Date().toISOString(),
          };

          return {
            readingHistory: [
              nextEntry,
              ...state.readingHistory.filter((item) => item.href !== entry.href),
            ].slice(0, 10),
          };
        }),
      toggleFavoritePerson: (personId) =>
        set((state) => {
          const exists = state.favoritePeople.some(
            (item) => item.personId === personId,
          );

          return {
            favoritePeople: exists
              ? state.favoritePeople.filter((item) => item.personId !== personId)
              : [nextFavorite(personId), ...state.favoritePeople],
          };
        }),
    }),
    {
      name: "theosis-study-state",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hasHydrated = true;
        }
      },
    },
  ),
);

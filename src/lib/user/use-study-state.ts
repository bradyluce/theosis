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
  setPatronSaint: (personId: string) => void;
  togglePreferredFather: (personId: string) => void;
  togglehiddenFather: (personId: string) => void;
  movePreferredFather: (personId: string, direction: "up" | "down") => void;
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
      setPatronSaint: (personId) =>
        set((state) => ({
          preferences: { ...state.preferences, patronSaintPersonId: personId },
        })),
      togglePreferredFather: (personId) =>
        set((state) => {
          // Defensive defaults — older persisted states pre-date these fields.
          const preferred = state.preferences.preferredFatherIds ?? [];
          const hiddenSource = state.preferences.hiddenFatherIds ?? [];
          const exists = preferred.includes(personId);
          // Adding a preferred father implicitly un-hides them; the two
          // lists are mutually exclusive in practice.
          const hidden = hiddenSource.filter((id) => id !== personId);
          return {
            preferences: {
              ...state.preferences,
              preferredFatherIds: exists
                ? preferred.filter((id) => id !== personId)
                : [...preferred, personId],
              hiddenFatherIds: hidden,
            },
          };
        }),
      togglehiddenFather: (personId) =>
        set((state) => {
          const hidden = state.preferences.hiddenFatherIds ?? [];
          const preferredSource = state.preferences.preferredFatherIds ?? [];
          const exists = hidden.includes(personId);
          const preferred = preferredSource.filter((id) => id !== personId);
          return {
            preferences: {
              ...state.preferences,
              hiddenFatherIds: exists
                ? hidden.filter((id) => id !== personId)
                : [...hidden, personId],
              preferredFatherIds: preferred,
            },
          };
        }),
      movePreferredFather: (personId, direction) =>
        set((state) => {
          const list = state.preferences.preferredFatherIds ?? [];
          const index = list.indexOf(personId);
          if (index < 0) return {};
          const swapWith = direction === "up" ? index - 1 : index + 1;
          if (swapWith < 0 || swapWith >= list.length) return {};
          const next = list.slice();
          [next[index], next[swapWith]] = [next[swapWith], next[index]];
          return {
            preferences: { ...state.preferences, preferredFatherIds: next },
          };
        }),
    }),
    {
      name: "theosis-study-state",
      storage: createJSONStorage(() => localStorage),
      // Bump this when the persisted shape gains required fields and supply
      // a migration below. Without it, returning users whose localStorage
      // predates the new fields rehydrate with `undefined` slots and crash
      // on first read.
      version: 1,
      migrate: (persistedState, _version) => {
        if (!persistedState || typeof persistedState !== "object") {
          return persistedState as UserProfileSnapshot;
        }
        const state = persistedState as Partial<UserProfileSnapshot>;
        // v0 -> v1: ensure father-preference arrays exist on preferences.
        const prefs = state.preferences ?? userProfileSeed.preferences;
        state.preferences = {
          ...userProfileSeed.preferences,
          ...prefs,
          preferredFatherIds: prefs.preferredFatherIds ?? [],
          hiddenFatherIds: prefs.hiddenFatherIds ?? [],
        };
        return state as UserProfileSnapshot;
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hasHydrated = true;
        }
      },
    },
  ),
);

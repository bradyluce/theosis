"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  FavoritePerson,
  ReadingHistoryEntry,
  ReadingListItem,
  ReadingListStatus,
  SavedHighlight,
  SavedNote,
  SavedSearch,
  SavedVerse,
  UserProfileSnapshot,
} from "@/domain/user/types";
import type { PendingWrite } from "@theosis/core/sync";
import type { OnboardingStatus, ProfilePreferences } from "@/domain/user/types";
import { userProfileSeed } from "@/lib/content/seed/profile";

// Auth slice — not part of UserProfileSnapshot because it's per-device
// transient state, not per-user data. Reconstructed from Clerk's
// useUser() on every page load; `partialize` below excludes it from
// localStorage persistence.
export type AuthSlice = {
  clerkUserId: string | null;
  dbUserId: string | null;
  isHydrating: boolean;
  hydrationError: string | null;
  migrationStatus: "idle" | "pending" | "complete" | "failed";
  migrationError: string | null;
};

const DEFAULT_AUTH: AuthSlice = {
  clerkUserId: null,
  dbUserId: null,
  isHydrating: false,
  hydrationError: null,
  migrationStatus: "idle",
  migrationError: null,
};

type StudyState = UserProfileSnapshot & {
  // --- Auth + sync (added v3) ----------------------------------------------
  auth: AuthSlice;
  pendingWrites: PendingWrite[];
  // --- Existing -----------------------------------------------------------
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
  setLocation: (location: string) => void;
  // Generic preference setter — typed by ProfilePreferences key. Each call
  // updates the local store and emits a profile.patch via syncProfilePatch.
  setPreference: <K extends keyof ProfilePreferences>(
    key: K,
    value: ProfilePreferences[K],
  ) => void;
  // Commits the onboarding answer. Flips local + (when authed) server-side
  // status. After this returns, the route guard stops redirecting to
  // /onboarding/welcome.
  setOnboardingStatus: (status: OnboardingStatus) => void;
  // Reading list actions
  setReadingListStatus: (workId: string, status: ReadingListStatus) => void;
  removeFromReadingList: (workId: string) => void;
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

// Lazy-loaded sync emitters. Defined here as fire-and-forget no-ops on
// the server and as dynamic imports on the client to avoid the circular
// import (sync/queue.ts reads useStudyState.getState()).
function emitWrite(write: PendingWrite): void {
  if (typeof window === "undefined") return;
  void import("@/lib/sync/queue").then(({ enqueueWrite }) => {
    enqueueWrite(write);
  });
}
function emitProfilePatch(
  patch: import("@/lib/sync/sync-profile").LegacyProfilePatch,
): void {
  if (typeof window === "undefined") return;
  void import("@/lib/sync/sync-profile").then(({ syncProfilePatch }) => {
    void syncProfilePatch(patch);
  });
}

// verseId is "<translation>:<book>.<chapter>.<verse>" in the legacy local
// shape. The server stores translation-agnostic verseKey + translationId
// separately; strip the prefix here at the boundary.
function stripTranslation(verseId: string): string {
  const colon = verseId.indexOf(":");
  return colon >= 0 ? verseId.slice(colon + 1) : verseId;
}

export const useStudyState = create<StudyState>()(
  persist(
    (set) => ({
      ...userProfileSeed,
      auth: DEFAULT_AUTH,
      pendingWrites: [],
      hasHydrated: false,
      toggleSavedVerse: (verseId, translationId) =>
        set((state) => {
          const existing = state.savedVerses.find((item) => item.verseId === verseId);
          if (existing) {
            emitWrite({ kind: "savedVerse.delete", clientId: existing.id });
            return {
              savedVerses: state.savedVerses.filter((item) => item.verseId !== verseId),
            };
          }
          const next = nextSavedVerse(verseId, translationId);
          emitWrite({
            kind: "savedVerse.create",
            clientId: next.id,
            verseKey: stripTranslation(verseId),
            translationId,
          });
          return { savedVerses: [next, ...state.savedVerses] };
        }),
      toggleHighlight: (targetType, targetId, excerpt) =>
        set((state) => {
          const existing = state.highlights.find(
            (item) => item.targetType === targetType && item.targetId === targetId,
          );
          if (existing) {
            emitWrite({ kind: "highlight.delete", clientId: existing.id });
            return {
              highlights: state.highlights.filter(
                (item) => !(item.targetType === targetType && item.targetId === targetId),
              ),
            };
          }
          const next = nextHighlight(targetType, targetId, excerpt);
          emitWrite({
            kind: "highlight.upsert",
            clientId: next.id,
            targetType,
            targetId,
            color: "gold",
            excerpt,
          });
          return { highlights: [next, ...state.highlights] };
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
          // expectedVersion 0 = create new; subsequent edits on the same
          // note would need to track the server version. Phase 3 prep
          // adds the version field to the local shape.
          emitWrite({
            kind: "note.upsert",
            clientId: nextNote.id,
            targetType,
            targetId,
            title: nextNote.title,
            body: nextNote.body,
            version: 0,
          });

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
          emitWrite({
            kind: "recentSearch.create",
            clientId: nextEntry.id,
            query,
          });
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
          emitWrite({
            kind: "readingHistory.create",
            clientId: nextEntry.id,
            href: nextEntry.href,
            label: nextEntry.label,
          });
          return {
            readingHistory: [
              nextEntry,
              ...state.readingHistory.filter((item) => item.href !== entry.href),
            ].slice(0, 10),
          };
        }),
      toggleFavoritePerson: (personId) =>
        set((state) => {
          const existing = state.favoritePeople.find(
            (item) => item.personId === personId,
          );
          if (existing) {
            emitWrite({ kind: "favoritePerson.delete", clientId: existing.id });
            return {
              favoritePeople: state.favoritePeople.filter(
                (item) => item.personId !== personId,
              ),
            };
          }
          const next = nextFavorite(personId);
          emitWrite({
            kind: "favoritePerson.create",
            clientId: next.id,
            personId,
          });
          return { favoritePeople: [next, ...state.favoritePeople] };
        }),
      setPatronSaint: (personId) => {
        emitProfilePatch({ patronSaintPersonId: personId });
        set((state) => ({
          preferences: { ...state.preferences, patronSaintPersonId: personId },
        }));
      },
      setLocation: (location) => {
        const trimmed = location.trim();
        emitProfilePatch({ location: trimmed });
        set((state) => ({
          preferences: { ...state.preferences, location: trimmed },
        }));
      },
      setPreference: (key, value) => {
        // Per-key sync — map the local key name into the corresponding
        // server field. The unified server profile uses the same names
        // for everything except patronSaintPersonId → patronSaintSlug
        // (handled inside syncProfilePatch).
        emitProfilePatch({ [key]: value } as Parameters<
          typeof emitProfilePatch
        >[0]);
        set((state) => ({
          preferences: { ...state.preferences, [key]: value },
        }));
      },
      setOnboardingStatus: (status) => {
        set({ onboardingStatus: status });
        // No server-side mirror for this field yet; the local state is
        // canonical until Phase 4 plumbs users.onboarding_status through
        // a dedicated /api/me/onboarding-status endpoint.
      },
      setReadingListStatus: (workId, status) =>
        set((state) => {
          const existing = (state.readingList ?? []).find(
            (item) => item.workId === workId,
          );
          const now = new Date().toISOString();
          const nextItem: ReadingListItem = existing
            ? { ...existing, status, updatedAt: now }
            : {
                id: `reading-list-${workId}`,
                workId,
                status,
                addedAt: now,
                updatedAt: now,
              };
          emitWrite({
            kind: "readingList.upsert",
            clientId: nextItem.id,
            workId,
            status,
          });
          const without = (state.readingList ?? []).filter(
            (item) => item.workId !== workId,
          );
          return { readingList: [nextItem, ...without] };
        }),
      removeFromReadingList: (workId) =>
        set((state) => {
          const existing = (state.readingList ?? []).find(
            (item) => item.workId === workId,
          );
          if (existing) {
            emitWrite({ kind: "readingList.delete", clientId: existing.id });
          }
          return {
            readingList: (state.readingList ?? []).filter(
              (item) => item.workId !== workId,
            ),
          };
        }),
      togglePreferredFather: (personId) =>
        set((state) => {
          // Defensive defaults — older persisted states pre-date these fields.
          const preferred = state.preferences.preferredFatherIds ?? [];
          const hiddenSource = state.preferences.hiddenFatherIds ?? [];
          const exists = preferred.includes(personId);
          // Adding a preferred father implicitly un-hides them; the two
          // lists are mutually exclusive in practice.
          const hidden = hiddenSource.filter((id) => id !== personId);
          const nextPreferred = exists
            ? preferred.filter((id) => id !== personId)
            : [...preferred, personId];
          emitProfilePatch({
            preferredFatherIds: nextPreferred,
            hiddenFatherIds: hidden,
          });
          return {
            preferences: {
              ...state.preferences,
              preferredFatherIds: nextPreferred,
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
          const nextHidden = exists
            ? hidden.filter((id) => id !== personId)
            : [...hidden, personId];
          emitProfilePatch({
            hiddenFatherIds: nextHidden,
            preferredFatherIds: preferred,
          });
          return {
            preferences: {
              ...state.preferences,
              hiddenFatherIds: nextHidden,
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
          emitProfilePatch({ preferredFatherIds: next });
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
      version: 3,
      // Auth slice is reconstructed from Clerk on every load — don't
      // serialize it. pendingWrites IS persisted so offline mutations
      // survive a refresh.
      partialize: (state) => {
        const { auth: _auth, hasHydrated: _hh, ...rest } = state;
        void _auth;
        void _hh;
        return rest;
      },
      migrate: (persistedState, version) => {
        if (!persistedState || typeof persistedState !== "object") {
          return persistedState as UserProfileSnapshot;
        }
        const state = persistedState as Partial<UserProfileSnapshot> & {
          pendingWrites?: PendingWrite[];
        };
        // v0 -> v1: ensure father-preference arrays exist on preferences.
        const prefs = state.preferences ?? userProfileSeed.preferences;
        state.preferences = {
          ...userProfileSeed.preferences,
          ...prefs,
          preferredFatherIds: prefs.preferredFatherIds ?? [],
          hiddenFatherIds: prefs.hiddenFatherIds ?? [],
          // v3 new preference slots — default any missing field.
          textSize: prefs.textSize ?? "md",
          status: prefs.status ?? null,
          jurisdiction: prefs.jurisdiction ?? null,
          parish: prefs.parish ?? null,
          parishId: prefs.parishId ?? null,
          commentaryRanking: prefs.commentaryRanking ?? "balanced",
          fastingLevel: prefs.fastingLevel ?? "standard",
        };
        // v1 -> v2: readingList field is now required.
        if (!state.readingList) state.readingList = [];
        // v2 -> v3: pendingWrites slot for offline sync queue. The auth
        // slice is per-device transient state — not migrated. Also
        // backfill onboardingStatus for users who pre-date the field.
        // Returning users with existing local data start "complete" so
        // we don't force them through onboarding; truly fresh devices
        // get "needs_onboarding" from the initial state.
        if (version < 3 && !state.pendingWrites) {
          state.pendingWrites = [];
        }
        if (state.onboardingStatus === undefined) {
          const hasAnyData =
            (state.savedVerses?.length ?? 0) > 0 ||
            (state.highlights?.length ?? 0) > 0 ||
            (state.notes?.length ?? 0) > 0 ||
            !!prefs.patronSaintPersonId;
          state.onboardingStatus = hasAnyData ? "complete" : "needs_onboarding";
        }
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

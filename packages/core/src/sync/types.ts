// Sync-layer types shared between web (Zustand store) and mobile (preferences
// module + React Query). These describe the "I have local data that needs to
// reach the server" boundary — separate from the user-data types themselves.

import type {
  ContentCompletion,
  FavoritePerson,
  PrayerRule,
  ProfilePreferences,
  ReadingHistoryEntry,
  ReadingListItem,
  SavedHighlight,
  SavedNote,
  SavedSearch,
  SavedVerse,
} from "../domain/user-types";

// ---------------------------------------------------------------------------
// ClientSnapshot — the shape clients package up for the anonymous-to-authed
// "claim" import. Same field set as UserProfileSnapshot but every server-
// assigned id is just the clientId (no server uuid yet).
// ---------------------------------------------------------------------------

export type ClientSnapshot = {
  preferences: ProfilePreferences;
  savedVerses: SavedVerse[];
  highlights: SavedHighlight[];
  notes: SavedNote[];
  favoritePeople: FavoritePerson[];
  readingList: ReadingListItem[];
  recentSearches: SavedSearch[];
  readingHistory: ReadingHistoryEntry[];
  prayerRule: PrayerRule;
  activityDays: string[];
  completions: ContentCompletion[];
};

export type ImportPayload = {
  // Stable device id (uuid stored in localStorage / SecureStore). Generated
  // lazily on first write attempt — anonymous users who never sign up never
  // get one. Server uses it to reject conflicting claims from a second device.
  anonymousId: string;
  snapshot: ClientSnapshot;
};

// ---------------------------------------------------------------------------
// PendingWrite — queued action when a write happens while offline or before
// auth lights up. Flushed sequentially when the user is online + signed in.
// Discriminated union: each shape carries just enough to replay.
// ---------------------------------------------------------------------------

export type PendingWrite =
  | { kind: "profile.patch"; patch: Partial<ProfilePreferences> }
  | { kind: "savedVerse.create"; clientId: string; verseKey: string; translationId: string }
  | { kind: "savedVerse.delete"; clientId: string }
  | {
      kind: "highlight.upsert";
      clientId: string;
      targetType: SavedHighlight["targetType"];
      targetId: string;
      color: SavedHighlight["color"];
      excerpt?: string;
    }
  | { kind: "highlight.delete"; clientId: string }
  | {
      kind: "note.upsert";
      clientId: string;
      targetType: SavedNote["targetType"];
      targetId: string;
      title: string;
      body: string;
      version: number;
    }
  | { kind: "note.delete"; clientId: string }
  | { kind: "favoritePerson.create"; clientId: string; personId: string }
  | { kind: "favoritePerson.delete"; clientId: string }
  | {
      kind: "readingList.upsert";
      clientId: string;
      workId: string;
      status: ReadingListItem["status"];
      positionChapterOrder?: number;
    }
  | { kind: "readingList.delete"; clientId: string }
  | { kind: "recentSearch.create"; clientId: string; query: string }
  | { kind: "recentSearch.clear" }
  | { kind: "readingHistory.create"; clientId: string; href: string; label: string }
  | { kind: "prayerRule.replace"; morning: string[]; evening: string[] }
  | { kind: "activityDay.record"; day: string }
  | { kind: "completion.create"; kind_: ContentCompletion["kind"]; slug: string };

// ---------------------------------------------------------------------------
// SyncStatus — UI-facing flag the app shell can render
// ---------------------------------------------------------------------------

export type SyncStatus = "idle" | "syncing" | "offline" | "error";

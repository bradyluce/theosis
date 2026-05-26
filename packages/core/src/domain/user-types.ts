// Canonical user-data types shared between web (Zustand store, /api/me) and
// mobile (preferences module, React Query). The web's `src/domain/user/types.ts`
// re-exports from here so the existing import path keeps working.
//
// Field-naming decisions (web ↔ mobile reconciliation):
//   - `verseKey` ("<book>.<chapter>.<verse>") replaces web's translation-prefixed
//     `verseId`. The reference helper `verseLocationKey()` already strips the
//     translation prefix; we follow suit so commentary keyed against any
//     translation matches a verse highlighted under any other.
//   - Highlight palette unified to the 5-color mobile slug set (gold/rose/
//     sky/sage/lavender). Web migration: sand→sky, linen→sage.
//   - Notes inherit web's richer discriminated `targetType`; mobile gains them.
//   - `displayName` is NOT stored here — Clerk owns it and clients read it off
//     `user.firstName ?? user.fullName ?? "Friend"`.

// ---------------------------------------------------------------------------
// Saved verses
// ---------------------------------------------------------------------------

export type SavedVerse = {
  // Server uuid (assigned on POST); same as `clientId` until the first sync.
  id: string;
  // Stable client-generated id ("saved-<verseKey>"). Used for idempotent POSTs
  // and DELETEs without round-tripping the server uuid.
  clientId: string;
  // Translation-agnostic "<book>.<chapter>.<verse>" — matches what the
  // commentary loader keys against.
  verseKey: string;
  // The translation the user was reading when they saved. Display only.
  translationId: string;
  createdAt: string;
  updatedAt: string;
};

// ---------------------------------------------------------------------------
// Highlights
// ---------------------------------------------------------------------------

export type HighlightColor =
  | "gold"
  | "rose"
  | "sky"
  | "sage"
  | "lavender";

export type HighlightTargetType = "verse" | "commentary" | "work-section";

export type SavedHighlight = {
  id: string;
  clientId: string;
  targetType: HighlightTargetType;
  // For verses: "<book>.<chapter>.<verse>". For commentary: the entry id.
  // For work-section: the section id (chapterId or sub-section).
  targetId: string;
  color: HighlightColor;
  // Optional snippet of the highlighted text — denormalized for offline list views.
  excerpt?: string;
  createdAt: string;
  updatedAt: string;
};

// ---------------------------------------------------------------------------
// Notes — only entity with soft-delete (real prose; accidental loss = bad)
// ---------------------------------------------------------------------------

export type NoteTargetType = "verse" | "chapter" | "work" | "person";

export type SavedNote = {
  id: string;
  clientId: string;
  targetType: NoteTargetType;
  targetId: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  // Optimistic-concurrency token. Client sends its known version on write;
  // server returns 409 with the current row on mismatch.
  version: number;
};

// ---------------------------------------------------------------------------
// Favorite people
// ---------------------------------------------------------------------------

export type FavoritePerson = {
  id: string;
  clientId: string;
  personId: string;
  createdAt: string;
  updatedAt: string;
};

// ---------------------------------------------------------------------------
// Reading list — Works the user has queued / is reading / has finished
// ---------------------------------------------------------------------------

export type ReadingListStatus = "read-later" | "reading" | "read";

export type ReadingListItem = {
  id: string;
  clientId: string;
  workId: string;
  status: ReadingListStatus;
  // Order index within the work's chapter list, if the user has progressed
  // past chapter 1. Optional — only set once a position has been recorded.
  positionChapterOrder?: number;
  createdAt: string;
  updatedAt: string;
};

// ---------------------------------------------------------------------------
// Recent searches & reading history
// ---------------------------------------------------------------------------

export type SavedSearch = {
  id: string;
  clientId: string;
  query: string;
  createdAt: string;
  updatedAt: string;
};

export type ReadingHistoryEntry = {
  id: string;
  clientId: string;
  label: string;
  href: string;
  createdAt: string;
  updatedAt: string;
};

// ---------------------------------------------------------------------------
// Prayer rule — morning/evening ordered lists of prayer-corpus item ids
// ---------------------------------------------------------------------------

export type PrayerRuleSlot = "morning" | "evening";

export type PrayerRuleItem = {
  id: string;
  clientId: string;
  slot: PrayerRuleSlot;
  // Reference into the shared prayer corpus (lives in @theosis/core/prayer/corpus).
  itemId: string;
  // Fractional sort key so inserting between items doesn't rewrite the whole list.
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type PrayerRule = {
  morning: PrayerRuleItem[];
  evening: PrayerRuleItem[];
};

// ---------------------------------------------------------------------------
// Content completions — guides/topics/work-chapters the user marked read
// ---------------------------------------------------------------------------

export type CompletionKind = "guide" | "topic" | "work-chapter";

export type ContentCompletion = {
  id: string;
  kind: CompletionKind;
  slug: string;
  completedAt: string;
};

// ---------------------------------------------------------------------------
// Preferences — every "knob" the app exposes
// ---------------------------------------------------------------------------

// Naming: "new-calendar" / "old-calendar" preserved from current web type for
// the on-disk migration story. The calendar lib's own type is "new" | "old";
// adapt at the boundary in src/lib/calendar (later phase).
export type CalendarPreference = "new-calendar" | "old-calendar";

export type UserStatus = "orthodox" | "catechumen" | "inquirer";

export type CommentaryRanking = "balanced" | "ancient-first" | "modern-first";

export type TextSize = "sm" | "md" | "lg" | "xl";

export type FastingLevel = "strict" | "standard" | "relaxed";

// 5-key default order — sourced from apps/mobile/lib/preferences.ts. The
// renderer ignores unknown keys and appends missing ones, so future cards
// don't break older persisted orders.
export type DailyCardKey =
  | "primary"
  | "readings"
  | "commemoration"
  | "prayer"
  | "hymns";

export const DEFAULT_DAILY_CARD_ORDER: DailyCardKey[] = [
  "primary",
  "readings",
  "commemoration",
  "prayer",
  "hymns",
];

export type ProfilePreferences = {
  // Calendar / reader display
  calendarPreference: CalendarPreference;
  primaryTranslationId: string;
  textSize: TextSize;

  // Identity (was mobile-only)
  status: UserStatus | null;
  jurisdiction: string | null; // matches existing Jurisdiction codes in domain/types.ts
  parish: string | null; // free-text fallback when no structured parish picked
  parishId: string | null; // "<state>/<slug>" from /api/parishes when chosen
  location: string | null; // free-text city distinct from parish (web's "Tyler")

  // Patron + father preferences
  patronSaintSlug: string | null;
  preferredFatherIds: string[];
  hiddenFatherIds: string[];
  commentaryRanking: CommentaryRanking;

  // Practice
  fastingLevel: FastingLevel;
  dailyCardOrder: DailyCardKey[];
};

export const DEFAULT_PROFILE_PREFERENCES: ProfilePreferences = {
  calendarPreference: "new-calendar",
  primaryTranslationId: "kjva",
  textSize: "md",
  status: null,
  jurisdiction: null,
  parish: null,
  parishId: null,
  location: null,
  patronSaintSlug: null,
  preferredFatherIds: [],
  hiddenFatherIds: [],
  commentaryRanking: "balanced",
  fastingLevel: "standard",
  dailyCardOrder: DEFAULT_DAILY_CARD_ORDER,
};

// ---------------------------------------------------------------------------
// Onboarding status — server-side state machine
// ---------------------------------------------------------------------------

export type OnboardingStatus = "anonymous" | "needs_onboarding" | "complete";

// ---------------------------------------------------------------------------
// Top-level snapshot — what `GET /api/me` returns and what the clients cache
// ---------------------------------------------------------------------------

export type UserProfileSnapshot = {
  preferences: ProfilePreferences;
  savedVerses: SavedVerse[];
  highlights: SavedHighlight[];
  notes: SavedNote[];
  favoritePeople: FavoritePerson[];
  readingList: ReadingListItem[];
  recentSearches: SavedSearch[];
  readingHistory: ReadingHistoryEntry[];
  prayerRule: PrayerRule;
  // ISO YYYY-MM-DD strings (one per day the app was opened). Streak is
  // derived on read — we don't store the count.
  activityDays: string[];
  completions: ContentCompletion[];
};

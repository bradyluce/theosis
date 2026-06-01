import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ReadingPlanProgress } from "@theosis/core";

import { enqueueWrite } from "./sync/queue";
import { syncProfilePatchMobile } from "./sync/sync-profile";

// Thin wrapper around AsyncStorage for app preferences. One JSON blob lives
// at the PREFS_KEY; reads/writes go through this module so call sites stay
// typed and the shape evolution is centralized.
//
// AsyncStorage is unencrypted and async — fine for non-sensitive prefs
// like "last read chapter" and "default translation." Anything sensitive
// (auth tokens, etc.) should use expo-secure-store instead.
//
// Every mutator below also fires a server-sync side effect via
// lib/sync/queue. When the user is anonymous, the sync is a no-op
// (the snapshot will be imported on first sign-in via /api/me/import).
// When signed in: try immediately, queue on failure for the next drain.

const PREFS_KEY = "theosis.prefs.v1";

export type LastReadLocation = {
  translation: string;
  book: string;
  chapter: number;
};

export type SavedVerse = {
  id: string;
  translation: string;
  book: string;
  chapter: number;
  verse: number;
  preview?: string;
  savedAt: string;
};

// Highlight color slugs — kept stable so they map to display colors in
// constants/highlight-colors.ts and never break old persisted data.
export type HighlightColor =
  | "gold"
  | "rose"
  | "sky"
  | "sage"
  | "lavender";

export type VerseHighlight = {
  // Composite key "<book>.<chapter>.<verse>" — translation-agnostic so
  // a verse highlighted in KJVA still glows when read in RSV.
  verseKey: string;
  color: HighlightColor;
  createdAt: string;
};

export type ReadingListItem = {
  id: string;
  // workSlug for navigation; title is denormalized so the list renders
  // without needing to fetch the work catalog.
  workSlug: string;
  title: string;
  addedAt: string;
};

export type ProfilePrefs = {
  displayName?: string;
  status?: "christian" | "catechumen" | "inquirer";
  parish?: string;
  patronSaintSlug?: string;
  // Birthday as ISO "YYYY-MM-DD". Only the month/day drives the Daily
  // celebration banner; the year is stored but never shown.
  birthday?: string;
  calendarSystem?: "new" | "julian";
  // Legacy 3-radio commentary ranking. Still respected when the user
  // hasn't customized the new per-Father picker, but the picker's
  // commentaryFathers config wins when set.
  commentaryRanking?: "balanced" | "ancient-first" | "modern-first";
  // Per-Father commentary configuration — populated by /commentary-fathers
  // and read by the verse commentary modal. `orderedSlugs` is the
  // explicit display order (highest first); `hiddenSlugs` are Fathers
  // the user has elected to hide entirely. Both default to empty —
  // meaning "use the catalog's natural rank with everyone visible."
  commentaryFathers?: {
    orderedSlugs?: string[];
    hiddenSlugs?: string[];
    // Stashed quick-filter (e.g. "eastern", "pre-nicene") so reopening
    // the picker remembers the user's last view. Doesn't affect the
    // commentary modal directly; that always reads the explicit
    // orderedSlugs / hiddenSlugs.
    quickFilter?: string;
  };
  // Phase 3 additions — mirror the unified ProfilePreferences on web.
  jurisdiction?:
    | "oca" | "goa" | "ant" | "roc" | "rom" | "ser"
    | "ukr" | "mos" | "bgr" | "alb" | "cpr" | "geo" | "other";
  fastingLevel?: "strict" | "standard" | "relaxed";
  primaryTranslationId?: string;
  // Phase 4. textSize scales body text in the Bible reader + commentary
  // modal. Default "md". The scale factors live in textSizeScale().
  textSize?: "sm" | "md" | "lg" | "xl";
  // Person slugs the user has favorited. Surfaced on the You tab and as
  // a filter when browsing the library. Distinct from patronSaintSlug —
  // patron is *the* one; favorites are everyone else worth keeping
  // close.
  favoritePersonSlugs?: string[];
};

// Scaling factor for the four textSize choices. Multiplied into the
// base font size in the Bible reader and commentary modal. 1.0 is the
// "md" default; users can shrink the prose to fit more on a page (sm)
// or grow it for reading without glasses (xl).
export function textSizeScale(
  size: ProfilePrefs["textSize"] | undefined,
): number {
  switch (size) {
    case "sm":
      return 0.88;
    case "lg":
      return 1.15;
    case "xl":
      return 1.32;
    case "md":
    default:
      return 1;
  }
}

// Completion marks — "✓ read" stamps on guides, topics, and individual
// work chapters. Persisted with the timestamp so we can surface a
// "completed today" indicator in the future.
export type CompletionKind = "guide" | "topic" | "work-chapter";

export type CompletionMark = {
  // Composite ID `${kind}::${slug}` — collisions are impossible because
  // the three kinds live in separate namespaces.
  id: string;
  kind: CompletionKind;
  slug: string;
  completedAt: string;
};

// Bookmark on the Daily page — the user marked today (or another day)
// as one to remember. Doesn't include the actual reading content
// because that comes back via /api/daily on demand; we just remember
// the date.
export type SavedDailyReading = {
  isoDate: string;     // YYYY-MM-DD
  savedAt: string;
};

// User-written note on a verse, chapter, work, or person. The target
// uniquely identifies what's being annotated — verseKey for verses,
// chapter ID for chapters, slug for works/persons. `version` is the
// optimistic-concurrency counter that lets the server reject stale
// updates (the same way notes work on web).
export type NoteTargetType = "verse" | "chapter" | "work" | "person";

export type SavedNote = {
  // clientId — composite "<targetType>::<targetId>" so the same target
  // can never have two notes. Server uses this as a stable lookup.
  id: string;
  targetType: NoteTargetType;
  targetId: string;
  title: string;
  body: string;
  // Server-side optimistic concurrency counter. New notes start at 0
  // and bump to 1 on first save. Subsequent edits increment.
  version: number;
  createdAt: string;
  updatedAt: string;
};

// Typed visit log — one entry per chapter the user opened in the
// Bible reader. Used by the You tab to show a "where I've been
// reading" feed. Capped at MAX_HISTORY entries per kind.
export type BibleHistoryEntry = {
  id: string;          // composite "<translation>:<book>.<chapter>"
  translationId: string;
  bookSlug: string;
  chapter: number;
  label: string;       // pre-formatted "Matthew 5" for the activity row
  visitedAt: string;
};

// Library visit log — one entry per Person / Work / Guide / Topic
// page the user opened. Same shape as bible history but typed for
// editorial content.
export type LibraryHistoryKind = "person" | "work" | "guide" | "topic";

export type LibraryHistoryEntry = {
  id: string;          // composite "<kind>:<slug>"
  kind: LibraryHistoryKind;
  slug: string;
  label: string;
  visitedAt: string;
};

// Per-chapter scroll position. Used by the chapter reader to restore
// the user back to where they stopped reading.
export type WorkReadingPosition = {
  id: string;          // composite "<workId>::<order>"
  workId: string;
  order: number;
  scrollY: number;
  lastReadAt: string;
};

// Bookmark for a whole work chapter — distinct from "Mark as read."
// The user explicitly chose to keep this chapter in their saved list,
// regardless of whether they've finished reading it.
export type SavedWorkChapter = {
  id: string;          // "<workId>::<order>"
  workId: string;
  order: number;
  workTitle: string;
  chapterLabel: string;
  savedAt: string;
};

// Color highlight on a single paragraph inside a work chapter. Keyed
// by (workId, order, sectionIdx, paragraphIdx) so highlights track
// stable positions as long as the underlying chapter content doesn't
// change.
export type WorkParagraphHighlight = {
  id: string;          // "<workId>::<order>::<sectionIdx>::<paragraphIdx>"
  workId: string;
  order: number;
  sectionIdx: number;
  paragraphIdx: number;
  color: HighlightColor;
  excerpt?: string;    // first ~120 chars for the You-tab preview
  createdAt: string;
};

// Saved commentary entry. The user starred a specific entry on a
// specific verse — keyed by both so highlighting "Augustine on Matt
// 5:3" doesn't collide with "Augustine on John 1:1". `id` is the
// composite "<verseKey>::<entryId>" used for storage uniqueness.
export type SavedCommentary = {
  id: string;
  verseKey: string;      // "matthew.5.3" — translation-agnostic
  entryId: string;       // original commentary entry id
  personSlug: string;    // navigation key for /people/<slug>
  personName: string;    // pre-resolved for the activity feed
  workTitle?: string;
  excerpt: string;       // first ~120 chars for preview
  savedAt: string;
};

// Diptych — a personal list of names the user holds up in prayer.
// Two parts: "living" (for whom we ask the Lord's mercy) and
// "departed" (for whom we ask repose). The names render in the
// prayer rule when included via "intercession-living" / "-departed"
// dynamic items, and stand on their own as a /diptych page.
export type DiptychEntry = {
  id: string;            // local-only uuid-like; never sent to server today
  name: string;
  relation?: string;     // free text: "godson", "spiritual father", etc.
  notes?: string;        // optional one-liner the user wants to remember
  addedAt: string;
};

export type Diptych = {
  living: DiptychEntry[];
  departed: DiptychEntry[];
};

export type PrayerRule = {
  morning: string[];
  evening: string[];
  // First-launch sentinel — if absent, we seed the starter rule on next read.
  initialized?: boolean;
};

// On-device notification settings. A single recurring DAILY trigger per
// prayer slot plus a window of dated content notifications are laid down by
// lib/notifications.ts. Local-only — like fastBannerCollapsed, this never
// round-trips through the profile snapshot.
export type PrayerReminderPref = {
  enabled: boolean;
  hour: number; // 0–23, device-local time
  minute: number; // 0–59
};

export type NotificationPrefs = {
  // Master switch. We keep our own flag alongside the OS permission so the
  // user can silence Theosis without revoking the OS grant, and so the
  // launch scheduler knows whether to lay anything down.
  enabled: boolean;
  // Every reminder kind now carries its own enabled flag + time of day, so
  // the user can stagger the day's feast, readings, fast, and greetings
  // independently of the prayer reminders. (These four were plain booleans
  // before — normalizeNotificationPrefs migrates the old shape on read.)
  feastSaint: PrayerReminderPref; // today's commemoration / feast
  fastReminder: PrayerReminderPref; // what the Church fasts today
  personalOccasions: PrayerReminderPref; // name-day, birthday
  dailyReadings: PrayerReminderPref; // the appointed Epistle & Gospel
  morningPrayer: PrayerReminderPref;
  eveningPrayer: PrayerReminderPref;
  // ISO "YYYY-MM-DD" the dated window was last laid through, so the launch
  // scheduler can skip a redundant reschedule within the same day.
  scheduledThrough?: string;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  enabled: false,
  feastSaint: { enabled: true, hour: 8, minute: 0 },
  fastReminder: { enabled: true, hour: 8, minute: 0 },
  personalOccasions: { enabled: true, hour: 8, minute: 0 },
  dailyReadings: { enabled: true, hour: 8, minute: 0 },
  morningPrayer: { enabled: true, hour: 7, minute: 0 },
  eveningPrayer: { enabled: false, hour: 20, minute: 30 },
};

// Daily card order — strings matching the card type discriminator used
// in app/(tabs)/index.tsx. Default order applies until the user reorders.
// "continue-reading" is a new Phase-4 card: it surfaces the user's
// last-read Bible location with a Continue CTA. It defaults to right
// under the feast hero so it's easy to spot on cold start.
export type DailyCardKey =
  | "primary"
  | "continue-reading"
  | "reading-plan"
  | "readings"
  | "commemoration"
  | "prayer"
  | "hymns";

export const DEFAULT_DAILY_CARD_ORDER: DailyCardKey[] = [
  "primary",
  "continue-reading",
  "reading-plan",
  "readings",
  "commemoration",
  "prayer",
  "hymns",
];

// Onboarding status — drives the first-launch route redirect on mobile.
// Mirrors web's OnboardingStatus type from src/domain/user/types.ts.
export type OnboardingStatus = "anonymous" | "needs_onboarding" | "complete";

export type AppPreferences = {
  lastRead?: LastReadLocation;
  recentSearches?: string[];
  profile?: ProfilePrefs;
  savedVerses?: SavedVerse[];
  readingList?: ReadingListItem[];
  // ISO date strings — one per day the app was opened. Used to compute
  // the streak count on the You tab.
  activityDays?: string[];
  prayerRule?: PrayerRule;
  // Persisted card order for the Daily home page. Keys must match
  // DailyCardKey; the renderer falls back to DEFAULT_DAILY_CARD_ORDER for
  // any key missing here (e.g. a key added in a later release).
  dailyCardOrder?: DailyCardKey[];
  // Cards the user has chosen to hide from the Daily home page. Keys stay
  // in dailyCardOrder (so they keep their slot if unhidden) — they're just
  // filtered out of the rendered list. Local-only UI pref, like
  // fastBannerCollapsed; it doesn't round-trip through the profile snapshot.
  dailyHiddenCards?: DailyCardKey[];
  highlights?: VerseHighlight[];
  // Onboarding state. Absent = first launch (treat as needs_onboarding).
  // Flipped to "complete" when the user finishes the onboarding flow or
  // chose "Continue as guest" at the last step.
  onboardingStatus?: OnboardingStatus;
  // Per-entry commentary stars. Surfaced in the activity feed on the
  // You tab and in saved-commentary filters.
  savedCommentary?: SavedCommentary[];
  // Personal diptych — names the user prays for. Two-column shape so
  // living and departed never blur.
  diptych?: Diptych;
  // "✓ read" stamps on guides, topics, and work chapters.
  completions?: CompletionMark[];
  // Bookmarks on the Daily page — dates the user wants to remember.
  savedDailyReadings?: SavedDailyReading[];
  // User-written prose attached to verses, chapters, works, or
  // persons. The note editor at /note/[targetType]/[targetId].tsx
  // creates/edits entries here.
  notes?: SavedNote[];
  // Typed reading history — split into Bible (chapters opened in the
  // reader) and Library (people / works / guides / topics opened). The
  // legacy `activityDays` continues to drive the streak; these arrays
  // give a richer "where I've been" feed.
  bibleReadingHistory?: BibleHistoryEntry[];
  libraryReadingHistory?: LibraryHistoryEntry[];
  // Per-chapter scroll positions inside work readers. Keyed by
  // workId::order. Restored on chapter mount.
  workReadingPositions?: WorkReadingPosition[];
  // Bookmarked work chapters (the work-side analog of savedVerses).
  savedWorkChapters?: SavedWorkChapter[];
  // Color highlights on work paragraphs.
  workHighlights?: WorkParagraphHighlight[];
  // Reading-plan progress, keyed by ReadingPlan.id. Local-only for now —
  // plan progress doesn't yet round-trip through /api/me/...; the plan
  // corpus is static so all the user contributes is a couple counters.
  readingPlanProgress?: ReadingPlanProgress[];
  // Whether the Daily fast banner is collapsed to its one-line summary.
  // Local-only UI preference; persists the user's last choice across visits.
  fastBannerCollapsed?: boolean;
  // On-device notification settings. Local-only (like fastBannerCollapsed) —
  // never round-trips through the profile snapshot.
  notifications?: NotificationPrefs;
};

const RECENT_SEARCHES_MAX = 8;

let memoCache: AppPreferences | null = null;

// Drop the in-memory prefs cache. Called by lib/sync/sign-out.ts after
// the on-disk blob is removed, so the next call to any getter reads an
// empty AppPreferences instead of serving the previous user's data.
export function clearMemoCache(): void {
  memoCache = null;
}

async function loadPrefs(): Promise<AppPreferences> {
  if (memoCache) return memoCache;
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (!raw) {
      memoCache = {};
      return memoCache;
    }
    const parsed = JSON.parse(raw) as AppPreferences;
    memoCache = parsed;
    return parsed;
  } catch {
    // Malformed JSON or read failure — fall back to empty prefs rather than
    // erroring up the call stack. Worst case the user sees the defaults.
    memoCache = {};
    return memoCache;
  }
}

async function savePrefs(prefs: AppPreferences): Promise<void> {
  memoCache = prefs;
  try {
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Write failure (e.g. disk full) — silent; the in-memory cache still
    // serves the rest of the session.
  }
}

// Serialize a read-modify-write against prefs. The common mutator pattern
//   const prefs = await loadPrefs(); await savePrefs({ ...prefs, field });
// is last-writer-wins: two mutators that run concurrently both read the same
// snapshot and the second save silently drops the first's field. mutatePrefs()
// chains each read-modify-write onto a single promise so they apply one at a
// time against the freshest prefs. Use it for any mutator that can run
// alongside another (fired together in a Promise.all, or from concurrent
// screen effects). The `fn` receives the latest prefs and returns the next
// prefs plus the value to resolve with.
let prefsWriteChain: Promise<unknown> = Promise.resolve();
function mutatePrefs<T>(
  fn: (prefs: AppPreferences) => { next: AppPreferences; result: T },
): Promise<T> {
  const run = prefsWriteChain.then(async () => {
    const prefs = await loadPrefs();
    const { next, result } = fn(prefs);
    await savePrefs(next);
    return result;
  });
  // Keep the chain alive even if one mutation throws, so a single failure
  // doesn't wedge every future write.
  prefsWriteChain = run.catch(() => undefined);
  return run;
}

export async function getLastReadLocation(): Promise<LastReadLocation | undefined> {
  const prefs = await loadPrefs();
  return prefs.lastRead;
}

export async function setLastReadLocation(
  location: LastReadLocation,
): Promise<void> {
  // Serialized: the Bible last-read write races the Daily/You mount writes
  // (activity day) on cold start; an unserialized RMW dropped whichever lost.
  await mutatePrefs((prefs) => ({
    next: { ...prefs, lastRead: location },
    result: undefined,
  }));
}

export async function getRecentSearches(): Promise<string[]> {
  const prefs = await loadPrefs();
  return prefs.recentSearches ?? [];
}

export async function addRecentSearch(query: string): Promise<string[]> {
  const trimmed = query.trim();
  if (!trimmed) return getRecentSearches();
  const prefs = await loadPrefs();
  const existing = prefs.recentSearches ?? [];
  const next = [
    trimmed,
    ...existing.filter((q) => q.toLowerCase() !== trimmed.toLowerCase()),
  ].slice(0, RECENT_SEARCHES_MAX);
  await savePrefs({ ...prefs, recentSearches: next });
  void enqueueWrite({
    kind: "recentSearch.create",
    clientId: `search-${trimmed.toLowerCase().replace(/\s+/g, "-")}`,
    query: trimmed,
  });
  return next;
}

export async function clearRecentSearches(): Promise<void> {
  const prefs = await loadPrefs();
  await savePrefs({ ...prefs, recentSearches: [] });
  void enqueueWrite({ kind: "recentSearch.clear" });
}

export async function getProfilePrefs(): Promise<ProfilePrefs> {
  const prefs = await loadPrefs();
  return prefs.profile ?? {};
}

export async function updateProfilePrefs(
  patch: Partial<ProfilePrefs>,
): Promise<ProfilePrefs> {
  const prefs = await loadPrefs();
  const next: ProfilePrefs = { ...(prefs.profile ?? {}), ...patch };
  await savePrefs({ ...prefs, profile: next });
  // Profile patches need optimistic concurrency on the server — see
  // syncProfilePatchMobile for fetch-then-patch logic. Fire-and-forget.
  void syncProfilePatchMobile(patch);
  return next;
}

export async function getSavedVerses(): Promise<SavedVerse[]> {
  const prefs = await loadPrefs();
  return prefs.savedVerses ?? [];
}

// Add a saved verse (idempotent — duplicates with the same id are ignored).
// Returns the updated list so callers can update UI state in one call.
export async function addSavedVerse(verse: SavedVerse): Promise<SavedVerse[]> {
  const prefs = await loadPrefs();
  const existing = prefs.savedVerses ?? [];
  if (existing.some((v) => v.id === verse.id)) return existing;
  const next = [verse, ...existing];
  await savePrefs({ ...prefs, savedVerses: next });
  void enqueueWrite({
    kind: "savedVerse.create",
    clientId: verse.id,
    verseKey: `${verse.book}.${verse.chapter}.${verse.verse}`,
    translationId: verse.translation,
  });
  return next;
}

export async function removeSavedVerse(id: string): Promise<SavedVerse[]> {
  const prefs = await loadPrefs();
  const next = (prefs.savedVerses ?? []).filter((v) => v.id !== id);
  await savePrefs({ ...prefs, savedVerses: next });
  void enqueueWrite({ kind: "savedVerse.delete", clientId: id });
  return next;
}

export async function isVerseSaved(id: string): Promise<boolean> {
  const prefs = await loadPrefs();
  return (prefs.savedVerses ?? []).some((v) => v.id === id);
}

// --- Highlights ------------------------------------------------------------

export async function getHighlights(): Promise<VerseHighlight[]> {
  const prefs = await loadPrefs();
  return prefs.highlights ?? [];
}

// Set the highlight color for a verse. Calling with the same color twice
// removes it (toggle behavior); calling with a different color overwrites.
export async function setVerseHighlight(
  verseKey: string,
  color: HighlightColor | null,
): Promise<VerseHighlight[]> {
  const prefs = await loadPrefs();
  const existing = prefs.highlights ?? [];
  const without = existing.filter((h) => h.verseKey !== verseKey);
  const next =
    color == null
      ? without
      : [
          ...without,
          { verseKey, color, createdAt: new Date().toISOString() },
        ];
  await savePrefs({ ...prefs, highlights: next });
  const clientId = `highlight-verse-${verseKey}`;
  if (color == null) {
    void enqueueWrite({ kind: "highlight.delete", clientId });
  } else {
    void enqueueWrite({
      kind: "highlight.upsert",
      clientId,
      targetType: "verse",
      targetId: verseKey,
      color,
    });
  }
  return next;
}

export function highlightKey(book: string, chapter: number, verse: number) {
  return `${book}.${chapter}.${verse}`;
}

// --- Saved commentary ------------------------------------------------------

export async function getSavedCommentary(): Promise<SavedCommentary[]> {
  const prefs = await loadPrefs();
  return prefs.savedCommentary ?? [];
}

export function savedCommentaryId(verseKey: string, entryId: string): string {
  return `${verseKey}::${entryId}`;
}

export async function isCommentarySaved(
  verseKey: string,
  entryId: string,
): Promise<boolean> {
  const id = savedCommentaryId(verseKey, entryId);
  const prefs = await loadPrefs();
  return (prefs.savedCommentary ?? []).some((c) => c.id === id);
}

export async function addSavedCommentary(
  entry: Omit<SavedCommentary, "id" | "savedAt"> & { savedAt?: string },
): Promise<SavedCommentary[]> {
  const id = savedCommentaryId(entry.verseKey, entry.entryId);
  const prefs = await loadPrefs();
  const existing = prefs.savedCommentary ?? [];
  if (existing.some((c) => c.id === id)) return existing;
  const next: SavedCommentary = {
    ...entry,
    id,
    savedAt: entry.savedAt ?? new Date().toISOString(),
  };
  const list = [next, ...existing];
  await savePrefs({ ...prefs, savedCommentary: list });
  // Saved commentary doesn't have a dedicated /api/me endpoint yet —
  // when one lands, enqueueWrite here. For now it's local-only.
  return list;
}

export async function removeSavedCommentary(
  verseKey: string,
  entryId: string,
): Promise<SavedCommentary[]> {
  const id = savedCommentaryId(verseKey, entryId);
  const prefs = await loadPrefs();
  const list = (prefs.savedCommentary ?? []).filter((c) => c.id !== id);
  await savePrefs({ ...prefs, savedCommentary: list });
  return list;
}

// --- Diptych ---------------------------------------------------------------

const EMPTY_DIPTYCH: Diptych = { living: [], departed: [] };

export async function getDiptych(): Promise<Diptych> {
  const prefs = await loadPrefs();
  const d = prefs.diptych;
  return {
    living: d?.living ?? [],
    departed: d?.departed ?? [],
  };
}

// Random-ish ID generator that's collision-safe enough for AsyncStorage
// items the user creates one at a time. Combines time, a 7-digit
// random suffix, and a counter incremented per call — so even a user
// who mashes "Add" can't produce duplicates within the same JS tick.
let diptychIdCounter = 0;
function generateDiptychId(category: string): string {
  diptychIdCounter += 1;
  const rand = Math.random().toString(36).slice(2, 9);
  return `${category}-${Date.now()}-${rand}-${diptychIdCounter}`;
}

export async function addDiptychEntry(
  category: "living" | "departed",
  entry: Omit<DiptychEntry, "id" | "addedAt"> & { id?: string; addedAt?: string },
): Promise<Diptych> {
  const prefs = await loadPrefs();
  const current: Diptych = prefs.diptych ?? EMPTY_DIPTYCH;
  const id = entry.id ?? generateDiptychId(category);
  const next: DiptychEntry = {
    ...entry,
    id,
    addedAt: entry.addedAt ?? new Date().toISOString(),
  };
  const updated: Diptych = {
    living: category === "living" ? [next, ...current.living] : current.living,
    departed:
      category === "departed" ? [next, ...current.departed] : current.departed,
  };
  await savePrefs({ ...prefs, diptych: updated });
  return updated;
}

export async function updateDiptychEntry(
  category: "living" | "departed",
  id: string,
  patch: Partial<Omit<DiptychEntry, "id" | "addedAt">>,
): Promise<Diptych> {
  const prefs = await loadPrefs();
  const current: Diptych = prefs.diptych ?? EMPTY_DIPTYCH;
  const updated: Diptych = {
    living:
      category === "living"
        ? current.living.map((e) => (e.id === id ? { ...e, ...patch } : e))
        : current.living,
    departed:
      category === "departed"
        ? current.departed.map((e) => (e.id === id ? { ...e, ...patch } : e))
        : current.departed,
  };
  await savePrefs({ ...prefs, diptych: updated });
  return updated;
}

export async function removeDiptychEntry(
  category: "living" | "departed",
  id: string,
): Promise<Diptych> {
  const prefs = await loadPrefs();
  const current: Diptych = prefs.diptych ?? EMPTY_DIPTYCH;
  const updated: Diptych = {
    living:
      category === "living"
        ? current.living.filter((e) => e.id !== id)
        : current.living,
    departed:
      category === "departed"
        ? current.departed.filter((e) => e.id !== id)
        : current.departed,
  };
  await savePrefs({ ...prefs, diptych: updated });
  return updated;
}

// --- Completion marks -----------------------------------------------------

function completionId(kind: CompletionKind, slug: string): string {
  return `${kind}::${slug}`;
}

export async function getCompletions(): Promise<CompletionMark[]> {
  const prefs = await loadPrefs();
  return prefs.completions ?? [];
}

export async function isCompleted(
  kind: CompletionKind,
  slug: string,
): Promise<boolean> {
  const all = await getCompletions();
  const id = completionId(kind, slug);
  return all.some((c) => c.id === id);
}

export async function addCompletion(
  kind: CompletionKind,
  slug: string,
): Promise<CompletionMark[]> {
  const id = completionId(kind, slug);
  const prefs = await loadPrefs();
  const existing = prefs.completions ?? [];
  if (existing.some((c) => c.id === id)) return existing;
  const mark: CompletionMark = {
    id,
    kind,
    slug,
    completedAt: new Date().toISOString(),
  };
  const next = [mark, ...existing];
  await savePrefs({ ...prefs, completions: next });
  // Sync the "mark as read" to the server so it round-trips across devices.
  // (The queue has no completion.delete kind — completions are additive on the
  // server — so removeCompletion stays local-only by design.)
  void enqueueWrite({ kind: "completion.create", kind_: kind, slug });
  return next;
}

export async function removeCompletion(
  kind: CompletionKind,
  slug: string,
): Promise<CompletionMark[]> {
  const id = completionId(kind, slug);
  const prefs = await loadPrefs();
  const next = (prefs.completions ?? []).filter((c) => c.id !== id);
  await savePrefs({ ...prefs, completions: next });
  return next;
}

// --- Saved daily readings --------------------------------------------------

export async function getSavedDailyReadings(): Promise<SavedDailyReading[]> {
  const prefs = await loadPrefs();
  return prefs.savedDailyReadings ?? [];
}

export async function isDailyReadingSaved(
  isoDate: string,
): Promise<boolean> {
  const all = await getSavedDailyReadings();
  return all.some((d) => d.isoDate === isoDate);
}

export async function toggleSavedDailyReading(
  isoDate: string,
): Promise<SavedDailyReading[]> {
  const prefs = await loadPrefs();
  const existing = prefs.savedDailyReadings ?? [];
  const present = existing.some((d) => d.isoDate === isoDate);
  const next = present
    ? existing.filter((d) => d.isoDate !== isoDate)
    : [
        { isoDate, savedAt: new Date().toISOString() },
        ...existing,
      ];
  await savePrefs({ ...prefs, savedDailyReadings: next });
  return next;
}

// --- Notes -----------------------------------------------------------------

export function noteClientId(
  targetType: NoteTargetType,
  targetId: string,
): string {
  return `${targetType}::${targetId}`;
}

export async function getNotes(): Promise<SavedNote[]> {
  const prefs = await loadPrefs();
  return prefs.notes ?? [];
}

export async function getNoteFor(
  targetType: NoteTargetType,
  targetId: string,
): Promise<SavedNote | undefined> {
  const id = noteClientId(targetType, targetId);
  const all = await getNotes();
  return all.find((n) => n.id === id);
}

// Upsert: create a new note at this target if none exists, otherwise
// replace the title/body. Returns the new note shape with bumped
// version + updatedAt. Empty title + body deletes the note (so
// "save empty" is the in-editor delete affordance).
export async function upsertNote(
  targetType: NoteTargetType,
  targetId: string,
  title: string,
  body: string,
): Promise<SavedNote | null> {
  const id = noteClientId(targetType, targetId);
  const prefs = await loadPrefs();
  const existing = (prefs.notes ?? []).find((n) => n.id === id);
  const now = new Date().toISOString();

  // Empty title + body → delete the note entirely.
  if (!title.trim() && !body.trim()) {
    if (!existing) return null;
    const next = (prefs.notes ?? []).filter((n) => n.id !== id);
    await savePrefs({ ...prefs, notes: next });
    void enqueueWrite({ kind: "note.delete", clientId: id });
    return null;
  }

  const updated: SavedNote = existing
    ? {
        ...existing,
        title,
        body,
        version: existing.version + 1,
        updatedAt: now,
      }
    : {
        id,
        targetType,
        targetId,
        title,
        body,
        // New notes start at version 1 to match the server's insert default.
        // Starting at 0 caused the first edit to send expectedVersion 0 against
        // a server row already at 1 → a 409 that dropped the edit.
        version: 1,
        createdAt: now,
        updatedAt: now,
      };
  const others = (prefs.notes ?? []).filter((n) => n.id !== id);
  await savePrefs({ ...prefs, notes: [updated, ...others] });
  void enqueueWrite({
    kind: "note.upsert",
    clientId: id,
    targetType,
    targetId,
    title,
    body,
    // expectedVersion = the note's version BEFORE this write. For a brand-new
    // note that's the server's post-insert default (1); for an edit it's the
    // current stored version.
    version: existing?.version ?? 1,
  });
  return updated;
}

export async function deleteNote(
  targetType: NoteTargetType,
  targetId: string,
): Promise<void> {
  const id = noteClientId(targetType, targetId);
  const prefs = await loadPrefs();
  const next = (prefs.notes ?? []).filter((n) => n.id !== id);
  await savePrefs({ ...prefs, notes: next });
  void enqueueWrite({ kind: "note.delete", clientId: id });
}

// --- Reading history (split) ----------------------------------------------

// Trim per-kind history so an avid reader doesn't grow this to
// thousands of entries. 40 is enough to scroll a long way back and
// keeps the prefs blob small.
const MAX_HISTORY_PER_KIND = 40;

export async function getBibleReadingHistory(): Promise<BibleHistoryEntry[]> {
  const prefs = await loadPrefs();
  return prefs.bibleReadingHistory ?? [];
}

export async function recordBibleVisit(opts: {
  translationId: string;
  bookSlug: string;
  chapter: number;
  label: string;
}): Promise<void> {
  const id = `${opts.translationId}:${opts.bookSlug}.${opts.chapter}`;
  const prefs = await loadPrefs();
  const existing = prefs.bibleReadingHistory ?? [];
  // Drop any prior visit to the same chapter so the freshest one
  // floats to the top.
  const dedup = existing.filter((e) => e.id !== id);
  const next: BibleHistoryEntry = {
    id,
    translationId: opts.translationId,
    bookSlug: opts.bookSlug,
    chapter: opts.chapter,
    label: opts.label,
    visitedAt: new Date().toISOString(),
  };
  const list = [next, ...dedup].slice(0, MAX_HISTORY_PER_KIND);
  await savePrefs({ ...prefs, bibleReadingHistory: list });
}

export async function getLibraryReadingHistory(): Promise<
  LibraryHistoryEntry[]
> {
  const prefs = await loadPrefs();
  return prefs.libraryReadingHistory ?? [];
}

export async function recordLibraryVisit(opts: {
  kind: LibraryHistoryKind;
  slug: string;
  label: string;
}): Promise<void> {
  const id = `${opts.kind}:${opts.slug}`;
  const prefs = await loadPrefs();
  const existing = prefs.libraryReadingHistory ?? [];
  const dedup = existing.filter((e) => e.id !== id);
  const next: LibraryHistoryEntry = {
    id,
    kind: opts.kind,
    slug: opts.slug,
    label: opts.label,
    visitedAt: new Date().toISOString(),
  };
  const list = [next, ...dedup].slice(0, MAX_HISTORY_PER_KIND);
  await savePrefs({ ...prefs, libraryReadingHistory: list });
}

export async function clearReadingHistory(): Promise<void> {
  const prefs = await loadPrefs();
  await savePrefs({
    ...prefs,
    bibleReadingHistory: [],
    libraryReadingHistory: [],
  });
}

// --- Work reading positions ------------------------------------------------

function workPositionId(workId: string, order: number): string {
  return `${workId}::${order}`;
}

export async function getWorkPosition(
  workId: string,
  order: number,
): Promise<WorkReadingPosition | undefined> {
  const prefs = await loadPrefs();
  const id = workPositionId(workId, order);
  return (prefs.workReadingPositions ?? []).find((p) => p.id === id);
}

export async function setWorkPosition(
  workId: string,
  order: number,
  scrollY: number,
): Promise<void> {
  const id = workPositionId(workId, order);
  const prefs = await loadPrefs();
  const others = (prefs.workReadingPositions ?? []).filter((p) => p.id !== id);
  // Drop the entry entirely once the user scrolls back to the top —
  // signals "reset, start fresh next time" rather than persisting 0.
  if (scrollY <= 4) {
    await savePrefs({ ...prefs, workReadingPositions: others });
    return;
  }
  const next: WorkReadingPosition = {
    id,
    workId,
    order,
    scrollY,
    lastReadAt: new Date().toISOString(),
  };
  // Cap at 60 most-recent positions to bound the blob size.
  await savePrefs({
    ...prefs,
    workReadingPositions: [next, ...others].slice(0, 60),
  });
}

// --- Saved work chapters ---------------------------------------------------

function savedWorkChapterId(workId: string, order: number): string {
  return `${workId}::${order}`;
}

export async function getSavedWorkChapters(): Promise<SavedWorkChapter[]> {
  const prefs = await loadPrefs();
  return prefs.savedWorkChapters ?? [];
}

export async function isWorkChapterSaved(
  workId: string,
  order: number,
): Promise<boolean> {
  const id = savedWorkChapterId(workId, order);
  const all = await getSavedWorkChapters();
  return all.some((c) => c.id === id);
}

export async function toggleSavedWorkChapter(opts: {
  workId: string;
  order: number;
  workTitle: string;
  chapterLabel: string;
}): Promise<{ saved: boolean; list: SavedWorkChapter[] }> {
  const id = savedWorkChapterId(opts.workId, opts.order);
  const prefs = await loadPrefs();
  const existing = prefs.savedWorkChapters ?? [];
  const isSaved = existing.some((c) => c.id === id);
  if (isSaved) {
    const next = existing.filter((c) => c.id !== id);
    await savePrefs({ ...prefs, savedWorkChapters: next });
    return { saved: false, list: next };
  }
  const entry: SavedWorkChapter = {
    id,
    workId: opts.workId,
    order: opts.order,
    workTitle: opts.workTitle,
    chapterLabel: opts.chapterLabel,
    savedAt: new Date().toISOString(),
  };
  const next = [entry, ...existing];
  await savePrefs({ ...prefs, savedWorkChapters: next });
  return { saved: true, list: next };
}

// --- Work paragraph highlights --------------------------------------------

function workHighlightId(
  workId: string,
  order: number,
  sectionIdx: number,
  paragraphIdx: number,
): string {
  return `${workId}::${order}::${sectionIdx}::${paragraphIdx}`;
}

export async function getWorkHighlights(): Promise<WorkParagraphHighlight[]> {
  const prefs = await loadPrefs();
  return prefs.workHighlights ?? [];
}

// Returns the subset of highlights that apply to a specific chapter
// in the form of a Map keyed by "<sectionIdx>::<paragraphIdx>" so the
// chapter reader can do O(1) lookups inside its render loop.
export async function getWorkHighlightsFor(
  workId: string,
  order: number,
): Promise<Map<string, HighlightColor>> {
  const all = await getWorkHighlights();
  const out = new Map<string, HighlightColor>();
  for (const h of all) {
    if (h.workId === workId && h.order === order) {
      out.set(`${h.sectionIdx}::${h.paragraphIdx}`, h.color);
    }
  }
  return out;
}

export async function setWorkParagraphHighlight(opts: {
  workId: string;
  order: number;
  sectionIdx: number;
  paragraphIdx: number;
  color: HighlightColor | null;
  excerpt?: string;
}): Promise<WorkParagraphHighlight[]> {
  const id = workHighlightId(
    opts.workId,
    opts.order,
    opts.sectionIdx,
    opts.paragraphIdx,
  );
  const prefs = await loadPrefs();
  const without = (prefs.workHighlights ?? []).filter((h) => h.id !== id);
  if (opts.color == null) {
    await savePrefs({ ...prefs, workHighlights: without });
    return without;
  }
  const next: WorkParagraphHighlight = {
    id,
    workId: opts.workId,
    order: opts.order,
    sectionIdx: opts.sectionIdx,
    paragraphIdx: opts.paragraphIdx,
    color: opts.color,
    excerpt: opts.excerpt,
    createdAt: new Date().toISOString(),
  };
  const list = [next, ...without];
  await savePrefs({ ...prefs, workHighlights: list });
  return list;
}

// --- Favorite persons ------------------------------------------------------

export async function getFavoritePersonSlugs(): Promise<string[]> {
  const prefs = await loadPrefs();
  return prefs.profile?.favoritePersonSlugs ?? [];
}

export async function isFavoritePerson(slug: string): Promise<boolean> {
  const slugs = await getFavoritePersonSlugs();
  return slugs.includes(slug);
}

export async function toggleFavoritePerson(slug: string): Promise<string[]> {
  const prefs = await loadPrefs();
  const slugs = prefs.profile?.favoritePersonSlugs ?? [];
  const isFavorited = slugs.includes(slug);
  const next = isFavorited ? slugs.filter((s) => s !== slug) : [slug, ...slugs];
  await savePrefs({
    ...prefs,
    profile: { ...(prefs.profile ?? {}), favoritePersonSlugs: next },
  });
  // Favorites live in their own server table (favorite_people), NOT a column
  // on the profile row — so the profile PATCH (updateProfilePrefs) silently
  // drops favoritePersonSlugs. Enqueue the dedicated favoritePerson write
  // instead, matching the web client and the perform.ts handler. clientId
  // matches buildClientSnapshot's `favorite-<slug>` so the one-time import and
  // live toggles converge on the same server row.
  void enqueueWrite(
    isFavorited
      ? { kind: "favoritePerson.delete", clientId: `favorite-${slug}` }
      : { kind: "favoritePerson.create", clientId: `favorite-${slug}`, personId: slug },
  );
  return next;
}

export async function getReadingList(): Promise<ReadingListItem[]> {
  const prefs = await loadPrefs();
  return prefs.readingList ?? [];
}

// Stable per-work reading-list id. Derived from the workId so toggling is
// idempotent and the same item round-trips through the sync upsert/delete
// (clientId === this id).
export function readingListId(workId: string): string {
  return `reading-list:${workId}`;
}

export async function isInReadingList(workId: string): Promise<boolean> {
  const prefs = await loadPrefs();
  const id = readingListId(workId);
  return (prefs.readingList ?? []).some((r) => r.id === id);
}

// Add or remove a work from the reading list. Local-first: writes prefs
// immediately and enqueues the server sync (upsert/delete) fire-and-forget.
export async function toggleReadingList(opts: {
  workId: string;
  workSlug: string;
  title: string;
}): Promise<{ saved: boolean; list: ReadingListItem[] }> {
  const id = readingListId(opts.workId);
  const prefs = await loadPrefs();
  const existing = prefs.readingList ?? [];
  const already = existing.some((r) => r.id === id);
  if (already) {
    const next = existing.filter((r) => r.id !== id);
    await savePrefs({ ...prefs, readingList: next });
    void enqueueWrite({ kind: "readingList.delete", clientId: id });
    return { saved: false, list: next };
  }
  const entry: ReadingListItem = {
    id,
    workSlug: opts.workSlug,
    title: opts.title,
    addedAt: new Date().toISOString(),
  };
  const next = [entry, ...existing];
  await savePrefs({ ...prefs, readingList: next });
  void enqueueWrite({
    kind: "readingList.upsert",
    clientId: id,
    // Send the work SLUG as the server work_id, matching buildClientSnapshot's
    // import path and adoptServerSnapshot's restore (workSlug: r.workId).
    // Previously this sent the internal work.id while import sent the slug,
    // which let the same work land as two server rows and broke navigation
    // (a restored item linked to /works/<work.id>, which doesn't resolve).
    workId: opts.workSlug,
    status: "read-later",
  });
  return { saved: true, list: next };
}

// Streak counts the longest consecutive run of "app opened" days ending
// today (or yesterday — opening yesterday and not yet today still counts).
// Called from screens that count as a "session": Daily and You tabs.
export async function recordActivityToday(): Promise<{
  streak: number;
  days: string[];
}> {
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  // Serialized read-modify-write — this runs inside a Promise.all on the Daily
  // and You tabs alongside other prefs writers; an unserialized RMW could drop
  // a co-running write (the last-read clobber the audit flagged).
  return mutatePrefs((prefs) => {
    const existing = prefs.activityDays ?? [];
    const days = existing.includes(iso) ? existing : [...existing, iso].sort();
    if (days !== existing) {
      void enqueueWrite({ kind: "activityDay.record", day: iso });
    }
    return { next: { ...prefs, activityDays: days }, result: { streak: computeStreak(days), days } };
  });
}

export async function getActivityStreak(): Promise<number> {
  const prefs = await loadPrefs();
  return computeStreak(prefs.activityDays ?? []);
}

// --- Prayer rule -----------------------------------------------------------

export async function getPrayerRule(): Promise<PrayerRule> {
  const prefs = await loadPrefs();
  return prefs.prayerRule ?? { morning: [], evening: [], initialized: false };
}

export async function setPrayerRule(rule: PrayerRule): Promise<void> {
  const prefs = await loadPrefs();
  await savePrefs({ ...prefs, prayerRule: { ...rule, initialized: true } });
  void enqueueWrite({
    kind: "prayerRule.replace",
    morning: rule.morning,
    evening: rule.evening,
  });
}

// Add an item to morning or evening at the given index (or end if undefined).
// Returns the updated rule.
export async function addPrayerToRule(
  slot: "morning" | "evening",
  itemId: string,
  index?: number,
): Promise<PrayerRule> {
  const rule = await getPrayerRule();
  const list = [...rule[slot]];
  if (typeof index === "number" && index >= 0 && index <= list.length) {
    list.splice(index, 0, itemId);
  } else {
    list.push(itemId);
  }
  const next: PrayerRule = { ...rule, [slot]: list, initialized: true };
  await setPrayerRule(next);
  return next;
}

export async function removePrayerFromRule(
  slot: "morning" | "evening",
  itemId: string,
): Promise<PrayerRule> {
  const rule = await getPrayerRule();
  const next: PrayerRule = {
    ...rule,
    [slot]: rule[slot].filter((id) => id !== itemId),
    initialized: true,
  };
  await setPrayerRule(next);
  return next;
}

export async function reorderPrayerRule(
  slot: "morning" | "evening",
  nextOrder: string[],
): Promise<PrayerRule> {
  const rule = await getPrayerRule();
  const next: PrayerRule = { ...rule, [slot]: nextOrder, initialized: true };
  await setPrayerRule(next);
  return next;
}

// --- Daily card order ------------------------------------------------------

export async function getDailyCardOrder(): Promise<DailyCardKey[]> {
  const prefs = await loadPrefs();
  const stored = prefs.dailyCardOrder ?? [];
  // Ensure every default key appears (in case we added one in a release).
  const filtered = stored.filter((k) =>
    (DEFAULT_DAILY_CARD_ORDER as string[]).includes(k),
  );
  for (const key of DEFAULT_DAILY_CARD_ORDER) {
    if (!filtered.includes(key)) filtered.push(key);
  }
  return filtered;
}

export async function setDailyCardOrder(order: DailyCardKey[]): Promise<void> {
  const prefs = await loadPrefs();
  await savePrefs({ ...prefs, dailyCardOrder: order });
}

export async function getDailyHiddenCards(): Promise<DailyCardKey[]> {
  const prefs = await loadPrefs();
  const stored = prefs.dailyHiddenCards ?? [];
  return stored.filter((k) =>
    (DEFAULT_DAILY_CARD_ORDER as string[]).includes(k),
  );
}

export async function setDailyHiddenCards(
  hidden: DailyCardKey[],
): Promise<void> {
  const prefs = await loadPrefs();
  await savePrefs({ ...prefs, dailyHiddenCards: hidden });
}

// Flip one card's hidden state and persist. Returns the new hidden list so
// callers can update local state without a re-read.
export async function toggleDailyCardHidden(
  key: DailyCardKey,
): Promise<DailyCardKey[]> {
  const hidden = await getDailyHiddenCards();
  const next = hidden.includes(key)
    ? hidden.filter((k) => k !== key)
    : [...hidden, key];
  await setDailyHiddenCards(next);
  return next;
}

// --- Daily fast banner collapse (local-only UI pref) -----------------------

export async function getFastBannerCollapsed(): Promise<boolean> {
  const prefs = await loadPrefs();
  return prefs.fastBannerCollapsed ?? false;
}

export async function setFastBannerCollapsed(collapsed: boolean): Promise<void> {
  const prefs = await loadPrefs();
  await savePrefs({ ...prefs, fastBannerCollapsed: collapsed });
}

// --- Notification settings (local-only) ------------------------------------

// Coerce one stored reminder slot into the current { enabled, hour, minute }
// shape. Handles three cases: the legacy plain boolean (feast/fast/personal
// predate per-type times), a partial/complete object, and missing/garbage.
function coerceReminder(
  value: unknown,
  fallback: PrayerReminderPref,
): PrayerReminderPref {
  if (typeof value === "boolean") return { ...fallback, enabled: value };
  if (value && typeof value === "object") {
    const o = value as Partial<PrayerReminderPref>;
    return {
      enabled: typeof o.enabled === "boolean" ? o.enabled : fallback.enabled,
      hour: typeof o.hour === "number" ? o.hour : fallback.hour,
      minute: typeof o.minute === "number" ? o.minute : fallback.minute,
    };
  }
  return { ...fallback };
}

// Normalize the persisted blob (any historical shape) into a complete,
// current NotificationPrefs. Used by BOTH read and write so the stored value
// converges to the new shape and the UI never sees a stray boolean.
function normalizeNotificationPrefs(stored: unknown): NotificationPrefs {
  if (!stored || typeof stored !== "object") {
    return { ...DEFAULT_NOTIFICATION_PREFS };
  }
  const s = stored as Record<string, unknown>;
  return {
    enabled:
      typeof s.enabled === "boolean"
        ? s.enabled
        : DEFAULT_NOTIFICATION_PREFS.enabled,
    feastSaint: coerceReminder(s.feastSaint, DEFAULT_NOTIFICATION_PREFS.feastSaint),
    fastReminder: coerceReminder(
      s.fastReminder,
      DEFAULT_NOTIFICATION_PREFS.fastReminder,
    ),
    personalOccasions: coerceReminder(
      s.personalOccasions,
      DEFAULT_NOTIFICATION_PREFS.personalOccasions,
    ),
    dailyReadings: coerceReminder(
      s.dailyReadings,
      DEFAULT_NOTIFICATION_PREFS.dailyReadings,
    ),
    morningPrayer: coerceReminder(
      s.morningPrayer,
      DEFAULT_NOTIFICATION_PREFS.morningPrayer,
    ),
    eveningPrayer: coerceReminder(
      s.eveningPrayer,
      DEFAULT_NOTIFICATION_PREFS.eveningPrayer,
    ),
    scheduledThrough:
      typeof s.scheduledThrough === "string" ? s.scheduledThrough : undefined,
  };
}

export async function getNotificationPrefs(): Promise<NotificationPrefs> {
  const prefs = await loadPrefs();
  return normalizeNotificationPrefs(prefs.notifications);
}

// Serialized read-modify-write — settings edits and the launch reschedule
// (which stamps scheduledThrough) can fire close together; mutatePrefs keeps
// them from clobbering each other. `current` is normalized first so a patch
// that touches one slot doesn't leave the others in a legacy boolean shape.
export async function setNotificationPrefs(
  patch: Partial<NotificationPrefs>,
): Promise<NotificationPrefs> {
  return mutatePrefs((prefs) => {
    const current = normalizeNotificationPrefs(prefs.notifications);
    const next: NotificationPrefs = { ...current, ...patch };
    return { next: { ...prefs, notifications: next }, result: next };
  });
}

// --- Onboarding status -----------------------------------------------------

export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  const prefs = await loadPrefs();
  return prefs.onboardingStatus ?? "needs_onboarding";
}

export async function setOnboardingStatus(
  status: OnboardingStatus,
): Promise<void> {
  const prefs = await loadPrefs();
  await savePrefs({ ...prefs, onboardingStatus: status });
}

// --- Reading-plan progress -------------------------------------------------

export async function getReadingPlanProgress(): Promise<ReadingPlanProgress[]> {
  const prefs = await loadPrefs();
  return prefs.readingPlanProgress ?? [];
}

export async function startReadingPlan(planId: string): Promise<ReadingPlanProgress[]> {
  const prefs = await loadPrefs();
  const existing = prefs.readingPlanProgress ?? [];
  if (existing.some((p) => p.planId === planId)) return existing;
  const now = new Date().toISOString();
  const next: ReadingPlanProgress = {
    planId,
    startedAt: now,
    currentDay: 1,
    completedDays: [],
    lastReadAt: now,
  };
  const out = [...existing, next];
  await savePrefs({ ...prefs, readingPlanProgress: out });
  return out;
}

// Mark a day complete. Idempotent. Auto-advances currentDay if the user
// just finished it — keeps the home tile current without manual bumping.
export async function markReadingPlanDay(
  planId: string,
  day: number,
): Promise<ReadingPlanProgress[]> {
  const prefs = await loadPrefs();
  const existing = prefs.readingPlanProgress ?? [];
  const out = existing.map((p) => {
    if (p.planId !== planId) return p;
    if (p.completedDays.includes(day)) return p;
    const completedDays = [...p.completedDays, day].sort((a, b) => a - b);
    const currentDay = day === p.currentDay ? day + 1 : p.currentDay;
    return {
      ...p,
      completedDays,
      currentDay,
      lastReadAt: new Date().toISOString(),
    };
  });
  await savePrefs({ ...prefs, readingPlanProgress: out });
  return out;
}

export async function unmarkReadingPlanDay(
  planId: string,
  day: number,
): Promise<ReadingPlanProgress[]> {
  const prefs = await loadPrefs();
  const existing = prefs.readingPlanProgress ?? [];
  const out = existing.map((p) =>
    p.planId === planId
      ? {
          ...p,
          completedDays: p.completedDays.filter((d) => d !== day),
          lastReadAt: new Date().toISOString(),
        }
      : p,
  );
  await savePrefs({ ...prefs, readingPlanProgress: out });
  return out;
}

export async function setReadingPlanCurrentDay(
  planId: string,
  day: number,
): Promise<ReadingPlanProgress[]> {
  const prefs = await loadPrefs();
  const existing = prefs.readingPlanProgress ?? [];
  const out = existing.map((p) =>
    p.planId === planId
      ? { ...p, currentDay: day, lastReadAt: new Date().toISOString() }
      : p,
  );
  await savePrefs({ ...prefs, readingPlanProgress: out });
  return out;
}

export async function removeReadingPlan(
  planId: string,
): Promise<ReadingPlanProgress[]> {
  const prefs = await loadPrefs();
  const existing = prefs.readingPlanProgress ?? [];
  const out = existing.filter((p) => p.planId !== planId);
  await savePrefs({ ...prefs, readingPlanProgress: out });
  return out;
}

function computeStreak(daysIsoSorted: string[]): number {
  if (daysIsoSorted.length === 0) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const oneDayMs = 24 * 60 * 60 * 1000;
  let streak = 0;
  // Walk back from today; allow a 1-day gap (yesterday) at the start so a
  // user who opens the app yesterday but not yet today still has a streak.
  let cursor = new Date(today);
  const set = new Set(daysIsoSorted);
  const isoOf = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (!set.has(isoOf(cursor))) {
    cursor = new Date(cursor.getTime() - oneDayMs);
    if (!set.has(isoOf(cursor))) return 0;
  }
  while (set.has(isoOf(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - oneDayMs);
  }
  return streak;
}

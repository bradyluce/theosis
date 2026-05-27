import AsyncStorage from "@react-native-async-storage/async-storage";

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

// Daily card order — strings matching the card type discriminator used
// in app/(tabs)/index.tsx. Default order applies until the user reorders.
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
};

const RECENT_SEARCHES_MAX = 8;

let memoCache: AppPreferences | null = null;

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

export async function getLastReadLocation(): Promise<LastReadLocation | undefined> {
  const prefs = await loadPrefs();
  return prefs.lastRead;
}

export async function setLastReadLocation(
  location: LastReadLocation,
): Promise<void> {
  const prefs = await loadPrefs();
  await savePrefs({ ...prefs, lastRead: location });
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

export async function addDiptychEntry(
  category: "living" | "departed",
  entry: Omit<DiptychEntry, "id" | "addedAt"> & { id?: string; addedAt?: string },
): Promise<Diptych> {
  const prefs = await loadPrefs();
  const current: Diptych = prefs.diptych ?? EMPTY_DIPTYCH;
  const id = entry.id ?? `${category}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
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

export async function getReadingList(): Promise<ReadingListItem[]> {
  const prefs = await loadPrefs();
  return prefs.readingList ?? [];
}

// Streak counts the longest consecutive run of "app opened" days ending
// today (or yesterday — opening yesterday and not yet today still counts).
// Called from screens that count as a "session": Daily and You tabs.
export async function recordActivityToday(): Promise<{
  streak: number;
  days: string[];
}> {
  const prefs = await loadPrefs();
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const existing = prefs.activityDays ?? [];
  const days = existing.includes(iso) ? existing : [...existing, iso].sort();
  if (days !== existing) {
    await savePrefs({ ...prefs, activityDays: days });
    void enqueueWrite({ kind: "activityDay.record", day: iso });
  }
  return { streak: computeStreak(days), days };
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

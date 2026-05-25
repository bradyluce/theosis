import AsyncStorage from "@react-native-async-storage/async-storage";

// Thin wrapper around AsyncStorage for app preferences. One JSON blob lives
// at the PREFS_KEY; reads/writes go through this module so call sites stay
// typed and the shape evolution is centralized.
//
// AsyncStorage is unencrypted and async — fine for non-sensitive prefs
// like "last read chapter" and "default translation." Anything sensitive
// (auth tokens, etc.) should use expo-secure-store instead.

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
  commentaryRanking?: "balanced" | "ancient-first" | "modern-first";
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
  return next;
}

export async function clearRecentSearches(): Promise<void> {
  const prefs = await loadPrefs();
  await savePrefs({ ...prefs, recentSearches: [] });
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
  return next;
}

export async function removeSavedVerse(id: string): Promise<SavedVerse[]> {
  const prefs = await loadPrefs();
  const next = (prefs.savedVerses ?? []).filter((v) => v.id !== id);
  await savePrefs({ ...prefs, savedVerses: next });
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
  return next;
}

export function highlightKey(book: string, chapter: number, verse: number) {
  return `${book}.${chapter}.${verse}`;
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

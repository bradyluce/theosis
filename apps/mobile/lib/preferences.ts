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

export type AppPreferences = {
  lastRead?: LastReadLocation;
};

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

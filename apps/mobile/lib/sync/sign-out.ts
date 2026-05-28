// Local-data cleanup on sign-out and account deletion. Without this, the
// next user who signs in on the same device inherits the previous
// account's preferences blob (notes, highlights, diptych names, parish,
// patron) and the previous account's offline write queue gets drained
// against the new Clerk session. Family/shared-device leakage.
//
// Wired into:
//   - apps/mobile/app/auth.tsx          handleSignOut
//   - apps/mobile/app/settings.tsx      handleSignOut
//   - apps/mobile/app/settings.tsx      performDelete (after server confirms)
//
// Order matters: clear AsyncStorage and SecureStore on disk, reset
// in-memory caches so the next read repopulates from empty, THEN call
// Clerk's signOut(). Calling signOut() first would race against
// hydrateAndClaim() if the auth bridge effect re-fires.

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

import { resetAuthedApi } from "@/lib/auth";
import { clearMemoCache as clearPrefsMemoCache } from "@/lib/preferences";

import { clearAnonymousIdCache } from "./anonymous-id";
import { clearQueue, clearQueueMemoCache } from "./queue";

// Keys we own on disk that are scoped to "whoever is signed in right now."
// These all live under the `theosis.` prefix so the (currently-unused)
// claimed markers are easy to enumerate without listing the whole
// AsyncStorage keyspace.
const PREFS_KEY = "theosis.prefs.v1";
const PENDING_WRITES_KEY = "theosis.pending-writes.v1";
const ANONYMOUS_ID_KEY = "theosis.anonymous-id"; // SecureStore

// `theosis.claimed.<clerkUserId>.v1` markers are written by
// hydrateAndClaim to remember which Clerk accounts have had their
// anonymous payload imported. They're not sensitive on their own, but
// leaving them around means a user who signs in fresh on this device
// after a sign-out won't re-trigger import. Sweep them on sign-out.
const CLAIMED_PREFIX = "theosis.claimed.";

export async function clearLocalUserData(): Promise<void> {
  // 1. AsyncStorage: prefs blob + pending writes queue.
  try {
    await AsyncStorage.multiRemove([PREFS_KEY, PENDING_WRITES_KEY]);
  } catch {
    // Best effort — if the keystore is unavailable we still want to clear
    // the in-memory caches below so the session feels clean.
  }

  // 2. AsyncStorage: per-user claim markers. Iterate, filter, remove.
  try {
    const keys = await AsyncStorage.getAllKeys();
    const claimKeys = keys.filter((k) => k.startsWith(CLAIMED_PREFIX));
    if (claimKeys.length > 0) {
      await AsyncStorage.multiRemove(claimKeys);
    }
  } catch {
    // Same — best effort.
  }

  // 3. SecureStore: anonymous-id (the import-claim token).
  try {
    await SecureStore.deleteItemAsync(ANONYMOUS_ID_KEY);
  } catch {
    // Keystore failures are fine; in-memory cache reset below.
  }

  // 4. In-memory caches. Each module holds its own; reset them all so
  // the next read returns empty / regenerates rather than serving the
  // previous user's data.
  clearPrefsMemoCache();
  clearAnonymousIdCache();
  await clearQueue(); // also clears in-memory queue
  clearQueueMemoCache();
  resetAuthedApi();
}

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
import {
  clearMemoCache as clearPrefsMemoCache,
  getProfilePrefs,
} from "@/lib/preferences";

import { clearAnonymousIdCache } from "./anonymous-id";
import { syncProfilePatchMobile } from "./sync-profile";
import {
  clearQueue,
  clearQueueMemoCache,
  drainQueue,
  peekQueue,
} from "./queue";

// Flush any queued offline writes to the server BEFORE a sign-out wipes
// them. Without this, a user who saves a note/highlight/patron and then
// signs out while the "syncing" indicator is still showing loses those
// writes forever — clearLocalUserData() drops the pending-writes queue,
// and the writes never existed server-side. (This is exactly the data
// loss we hit during the Apple sign-in bring-up.)
//
// drainQueue() stops on the first failed write (one attempt, then break),
// so it can't loop forever — but a *slow* request could still hang, so we
// race it against a timeout. Returns the number of writes STILL pending
// after the attempt: 0 means everything reached the server; >0 means the
// caller should warn before discarding them.
export async function flushPendingBeforeSignOut(
  timeoutMs = 8000,
): Promise<number> {
  const work = (async () => {
    // 1. Profile fields (patron saint, parish, status, jurisdiction,
    //    translation, commentary prefs…) do NOT go through the queue —
    //    they sync via syncProfilePatchMobile, a separate fire-and-forget
    //    fetch-then-patch that the "syncing" indicator never reflects. So
    //    a queue-only flush would still lose the patron the user just set.
    //    Re-push the whole local profile here; the patch is idempotent.
    try {
      const profile = await getProfilePrefs();
      if (profile && Object.keys(profile).length > 0) {
        await syncProfilePatchMobile(profile);
      }
    } catch {
      // syncProfilePatchMobile already swallows its own errors; guard
      // anyway so a profile-read failure can't abort the queue drain.
    }
    // 2. Queued writes (notes, highlights, saved verses, reading list,
    //    prayer rule, activity days, completions…).
    await drainQueue();
  })();

  try {
    await Promise.race([
      work,
      new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
    ]);
  } catch {
    // Belt-and-suspenders; the inner calls swallow their own errors.
  }
  // Only the queue exposes a residual count. A profile patch that failed
  // can't be enumerated, but the queued-write count is the signal the
  // "syncing" indicator uses, so it's the right thing to gate sign-out on.
  try {
    return (await peekQueue()).length;
  } catch {
    return 0;
  }
}

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

// Full sign-out orchestration shared by auth.tsx and settings.tsx.
//
//   1. Flush in-flight writes (profile + queue) to the server.
//   2. If anything is STILL pending, ask the caller's `confirmDiscard`
//      whether to proceed — this is the "you have unsynced changes, sign
//      out anyway?" gate. If the caller declines, abort the sign-out
//      WITHOUT clearing local data, so the writes survive for a retry.
//   3. Clear local data, then call Clerk signOut().
//
// `confirmDiscard` receives the residual pending-write count and resolves
// true to proceed, false to abort. Omit it to always proceed (e.g. a
// forced sign-out where there's no UI to prompt).
//
// Returns true if sign-out proceeded, false if the user aborted.
export async function signOutWithFlush(opts: {
  signOut: () => Promise<unknown>;
  confirmDiscard?: (pendingCount: number) => Promise<boolean>;
}): Promise<boolean> {
  const residual = await flushPendingBeforeSignOut();
  if (residual > 0 && opts.confirmDiscard) {
    const proceed = await opts.confirmDiscard(residual);
    if (!proceed) return false;
  }
  await clearLocalUserData();
  await opts.signOut();
  return true;
}

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

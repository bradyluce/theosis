// Pending-writes queue for offline sync. Phase 1 ships a dormant stub —
// nothing calls into this yet because the per-action mutations in
// preferences.ts don't yet POST to /api/me/* (gated by SYNC_ENABLED).
// Phase 2 lights it up by:
//   - Each preferences.ts action calls enqueueWrite() on failure.
//   - useNetworkState() + Clerk auth signals trigger drainQueue().
//
// Stored alongside other prefs at key `theosis.pending-writes.v1` so
// queued writes survive an app cold-start.

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PendingWrite } from "@theosis/core/sync";

const STORAGE_KEY = "theosis.pending-writes.v1";

let memoCache: PendingWrite[] | null = null;

async function load(): Promise<PendingWrite[]> {
  if (memoCache) return memoCache;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    memoCache = raw ? (JSON.parse(raw) as PendingWrite[]) : [];
    return memoCache;
  } catch {
    memoCache = [];
    return memoCache;
  }
}

async function save(queue: PendingWrite[]): Promise<void> {
  memoCache = queue;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Disk full or similar — in-memory cache still serves the session.
  }
}

export async function enqueueWrite(write: PendingWrite): Promise<void> {
  const queue = await load();
  await save([...queue, write]);
}

export async function peekQueue(): Promise<PendingWrite[]> {
  return [...(await load())];
}

export async function clearQueue(): Promise<void> {
  await save([]);
}

// drainQueue is intentionally not exported yet — it lives in Phase 2 once
// getAuthedApi() actually does anything. Defining the queue shape now keeps
// the storage key stable across phases.

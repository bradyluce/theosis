// Pending-writes queue for offline sync. Each preferences.ts mutator calls
// enqueueWrite() after the local AsyncStorage update; the runner either
// issues the POST immediately (signed in + reachable) or persists the
// write so a later drainQueue() pass can retry. Storage key:
// `theosis.pending-writes.v1`. The auth provider in app/_layout.tsx
// triggers drainQueue() on sign-in + foreground.

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PendingWrite } from "@theosis/core/sync";

import { getAuthedApi } from "@/lib/auth";
import { performWrite } from "./perform";

const STORAGE_KEY = "theosis.pending-writes.v1";

let memoCache: PendingWrite[] | null = null;
let draining = false;

async function load(): Promise<PendingWrite[]> {
  if (memoCache) return memoCache;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    memoCache = raw ? (JSON.parse(raw) as PendingWrite[]) : [];
  } catch {
    memoCache = [];
  }
  return memoCache;
}

async function save(queue: PendingWrite[]): Promise<void> {
  memoCache = queue;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Disk full or similar; in-memory cache still serves the session.
  }
}

// Try the write now if we have an authed API; otherwise queue. Always
// fire-and-forget so the caller (preferences.ts mutator) doesn't block.
export async function enqueueWrite(write: PendingWrite): Promise<void> {
  const api = getAuthedApi();
  if (!api) {
    // Signed out — local mutation is enough; the snapshot will be imported
    // on first sign-in via /api/me/import.
    return;
  }
  try {
    await performWrite(write);
  } catch (err) {
    console.warn("[mobile sync] write failed; queuing for retry", write.kind, err);
    const queue = await load();
    await save([...queue, write]);
  }
}

export async function peekQueue(): Promise<PendingWrite[]> {
  return [...(await load())];
}

export async function clearQueue(): Promise<void> {
  await save([]);
}

// Drain queued writes sequentially. Called by the auth provider on
// sign-in / foreground. Stops on the first error so retries don't
// reorder dependent writes (e.g. create-then-delete).
export async function drainQueue(): Promise<void> {
  if (draining) return;
  const api = getAuthedApi();
  if (!api) return;
  draining = true;
  try {
    while (true) {
      const queue = await load();
      if (queue.length === 0) break;
      const [head, ...rest] = queue;
      try {
        await performWrite(head);
      } catch (err) {
        console.warn("[mobile sync] drain stopped on error", head.kind, err);
        break;
      }
      await save(rest);
    }
  } finally {
    draining = false;
  }
}

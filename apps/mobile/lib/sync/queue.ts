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
// Parallel map of clientId → attempt count so we can drop a permanently
// bad head after N tries rather than blocking the whole queue forever.
// Kept separate so we don't have to bump the @theosis/core/sync DTO.
const ATTEMPTS_KEY = "theosis.pending-writes-attempts.v1";
// After this many consecutive failures we give up on a write and drop
// it. Chosen so a transient outage (server flaking for an hour) doesn't
// burn through retries, but a permanently-rejected write (stale kind,
// schema change) doesn't permanently block the queue.
const MAX_ATTEMPTS = 5;
// Soft cap on the on-disk queue. A pathological case (sign-out forgotten,
// thousands of edits offline) would otherwise grow unbounded. At the cap
// we drop the oldest entries and warn once per session.
const MAX_QUEUE_SIZE = 500;

let memoCache: PendingWrite[] | null = null;
let attemptsMemoCache: Record<string, number> | null = null;
let draining = false;
let overflowWarned = false;

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

async function loadAttempts(): Promise<Record<string, number>> {
  if (attemptsMemoCache) return attemptsMemoCache;
  try {
    const raw = await AsyncStorage.getItem(ATTEMPTS_KEY);
    attemptsMemoCache = raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    attemptsMemoCache = {};
  }
  return attemptsMemoCache;
}

async function save(queue: PendingWrite[]): Promise<void> {
  // Soft cap: if the queue would blow past MAX_QUEUE_SIZE, drop the
  // oldest entries. We keep the newest writes because they're more
  // likely to still apply cleanly server-side.
  let next = queue;
  if (queue.length > MAX_QUEUE_SIZE) {
    next = queue.slice(queue.length - MAX_QUEUE_SIZE);
    if (!overflowWarned) {
      console.warn(
        "[mobile sync] pending-writes queue exceeded",
        MAX_QUEUE_SIZE,
        "entries; dropped oldest",
        queue.length - MAX_QUEUE_SIZE,
      );
      overflowWarned = true;
    }
  }
  memoCache = next;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Disk full or similar; in-memory cache still serves the session.
  }
}

async function saveAttempts(attempts: Record<string, number>): Promise<void> {
  attemptsMemoCache = attempts;
  try {
    await AsyncStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));
  } catch {
    // Persist failure is fine — in-memory cache continues to serve.
  }
}

// Each pending write needs a stable identity so we can track attempts
// without storing the count inline (would dirty the shared DTO). We
// hash the kind + clientId + a short body slice — collisions are
// harmless (just resets the attempt count) and there's no security
// dependence on the value.
function attemptKey(write: PendingWrite): string {
  const w = write as unknown as { clientId?: string; targetId?: string };
  return `${write.kind}|${w.clientId ?? w.targetId ?? ""}`;
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
  await saveAttempts({});
}

// Drop the in-memory caches without touching disk. Used by
// lib/sync/sign-out.ts after the on-disk blob is removed so the next
// load() repopulates from empty.
export function clearQueueMemoCache(): void {
  memoCache = null;
  attemptsMemoCache = null;
}

// Drain queued writes sequentially. Called by the auth provider on
// sign-in / foreground.
//
// On error: bump the head's attempt counter. If it's still under
// MAX_ATTEMPTS, stop the drain so dependent writes (e.g. create-then-
// delete) aren't reordered around it. If it's hit the cap, drop the
// head, warn, and continue draining — a single bad write shouldn't
// permanently block sync.
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
        // Success — clear any attempt count we'd been tracking.
        const attempts = await loadAttempts();
        const key = attemptKey(head);
        if (attempts[key]) {
          delete attempts[key];
          await saveAttempts(attempts);
        }
        await save(rest);
      } catch (err) {
        const attempts = await loadAttempts();
        const key = attemptKey(head);
        const count = (attempts[key] ?? 0) + 1;
        if (count >= MAX_ATTEMPTS) {
          console.warn(
            "[mobile sync] dropping write after",
            count,
            "failed attempts:",
            head.kind,
            err,
          );
          delete attempts[key];
          await saveAttempts(attempts);
          await save(rest);
          // Continue draining; the next entry might be healthy.
          continue;
        }
        attempts[key] = count;
        await saveAttempts(attempts);
        console.warn(
          "[mobile sync] drain stopped on error (attempt",
          count,
          "of",
          MAX_ATTEMPTS,
          ")",
          head.kind,
          err,
        );
        break;
      }
    }
  } finally {
    draining = false;
  }
}

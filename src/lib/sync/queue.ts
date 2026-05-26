"use client";

// Pending-writes queue runner. Each Zustand setter calls enqueueWrite();
// the runner either issues the POST immediately (online + signed in) or
// pushes onto the persisted queue. A separate drain() pass — triggered
// by the SyncProvider on online + auth transitions — flushes the queue.

import type { PendingWrite } from "@theosis/core/sync";

import { useStudyState } from "@/lib/user/use-study-state";
import { performWrite } from "./perform";

// Module-scoped flag so concurrent calls to drain() don't double-flush.
let draining = false;

export function enqueueWrite(write: PendingWrite): void {
  const state = useStudyState.getState();

  // Anonymous user — no server to talk to. Local mutation is enough; on
  // sign-up the claim flow will import the snapshot.
  if (!state.auth.clerkUserId) return;

  // Online: try immediately. On failure, persist the write so a future
  // online tick can retry. We don't block the caller on the network — the
  // local mutation already happened in the Zustand reducer.
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    pushPending(write);
    return;
  }

  performWrite(write).catch((err) => {
    console.warn("[sync] write failed; queuing for retry", write.kind, err);
    pushPending(write);
  });
}

function pushPending(write: PendingWrite) {
  useStudyState.setState((s) => ({
    pendingWrites: [...s.pendingWrites, write],
  }));
}

// Drain queued writes sequentially. Stops on the first error so retries
// don't reorder dependent writes (e.g. create-then-delete must not race).
export async function drainQueue(): Promise<void> {
  if (draining) return;
  draining = true;
  try {
    while (true) {
      const state = useStudyState.getState();
      if (!state.auth.clerkUserId) break;
      if (state.pendingWrites.length === 0) break;
      if (typeof navigator !== "undefined" && navigator.onLine === false) break;

      const [head, ...rest] = state.pendingWrites;
      try {
        await performWrite(head);
      } catch (err) {
        console.warn("[sync] drain stopped on error", head.kind, err);
        break;
      }
      useStudyState.setState({ pendingWrites: rest });
    }
  } finally {
    draining = false;
  }
}

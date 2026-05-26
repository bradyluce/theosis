"use client";

// Top-level Clerk → Zustand bridge for the web. Subscribes to Clerk's
// useUser() and:
//   - On isSignedIn flip → trigger hydrateAndClaim() once
//   - On isSignedIn === false → clear the auth slice
//   - On online events → drain the pending queue
// Returns null; mounts once inside <ClerkProvider> in the root layout.

import { useUser } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

import { drainQueue } from "@/lib/sync/queue";
import { hasLocalUserData, hydrateAndClaim } from "@/lib/sync/hydrate";
import { useStudyState } from "@/lib/user/use-study-state";

export function SyncProvider() {
  const { isLoaded, isSignedIn, user } = useUser();
  const lastClerkUserId = useRef<string | null>(null);

  // Auth state changes
  useEffect(() => {
    if (!isLoaded) return;
    const clerkUserId = isSignedIn && user ? user.id : null;
    if (clerkUserId === lastClerkUserId.current) return;
    lastClerkUserId.current = clerkUserId;

    if (clerkUserId) {
      const hasLocal = hasLocalUserData();
      void hydrateAndClaim({ clerkUserId, hasLocalData: hasLocal });
    } else {
      // Signed out: clear auth slice. Local snapshot stays (the user may
      // continue browsing anonymously); a subsequent sign-in re-imports.
      useStudyState.setState((s) => ({
        auth: {
          ...s.auth,
          clerkUserId: null,
          dbUserId: null,
          isHydrating: false,
          hydrationError: null,
          migrationStatus: "idle",
          migrationError: null,
        },
      }));
    }
  }, [isLoaded, isSignedIn, user]);

  // Online events → drain queue
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onOnline = () => {
      void drainQueue();
    };
    window.addEventListener("online", onOnline);
    // Try once on mount too, in case there were queued writes from a
    // previous session.
    void drainQueue();
    return () => {
      window.removeEventListener("online", onOnline);
    };
  }, []);

  return null;
}

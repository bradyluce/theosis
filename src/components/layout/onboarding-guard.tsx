"use client";

// Redirects to /onboarding/welcome when the user hasn't completed
// onboarding yet. Wraps the (shell) layout so every shell page is
// guarded; onboarding routes live outside (shell) and don't get
// intercepted.
//
// Anonymous users go through onboarding once; their answers persist
// to localStorage. After "Continue as guest" or sign-in at step 10,
// onboardingStatus flips to "complete" and the guard stops redirecting.

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useStudyState } from "@/lib/user/use-study-state";

export function OnboardingGuard() {
  const router = useRouter();
  const status = useStudyState((s) => s.onboardingStatus);
  const hasHydrated = useStudyState((s) => s.hasHydrated);

  useEffect(() => {
    // Wait for the persisted store to rehydrate before redirecting —
    // otherwise we'd briefly read the in-memory seed default and bounce
    // returning users into /onboarding before their real status loads.
    if (!hasHydrated) return;
    if (status === "needs_onboarding" || status === "anonymous") {
      router.replace("/onboarding");
    }
  }, [hasHydrated, status, router]);

  return null;
}

"use client";

// Bare /onboarding root — redirect to the current step. If the user has
// no draft yet, that's "welcome"; if they reloaded mid-flow, jump back
// to where they were.

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useOnboardingState } from "@/lib/user/use-onboarding-state";

export default function OnboardingIndexPage() {
  const router = useRouter();
  const currentStep = useOnboardingState((s) => s.currentStep);

  useEffect(() => {
    router.replace(`/onboarding/${currentStep}`);
  }, [currentStep, router]);

  return null;
}

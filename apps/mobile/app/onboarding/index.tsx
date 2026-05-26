// /onboarding root — bounces to the user's current step. Set by the state
// machine; defaults to "welcome" on fresh installs.

import { Redirect } from "expo-router";

import { useOnboardingState } from "@/lib/use-onboarding-state";

export default function OnboardingIndex() {
  const currentStep = useOnboardingState((s) => s.currentStep);
  return <Redirect href={`/onboarding/${currentStep}`} />;
}

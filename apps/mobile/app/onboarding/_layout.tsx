// Onboarding flow lives in its own Stack so all 10 steps share one
// navigator and `router.push("/onboarding/<next>")` works as a forward
// transition. Without this layout, each step file is a top-level route
// in the root Stack — push between them silently no-ops because the
// router has no "onboarding" group to traverse.
//
// All steps render their own progress dots + back/continue UI via
// <OnboardingShell>, so no header here.

import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
      }}
    />
  );
}

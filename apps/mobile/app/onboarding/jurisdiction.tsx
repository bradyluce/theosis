import { Stack } from "expo-router";
import {
  JURISDICTION_OPTIONS,
  defaultCalendarForJurisdiction,
} from "@theosis/core/onboarding";

import {
  OnboardingChoice,
  OnboardingShell,
} from "@/components/onboarding/onboarding-shell";
import { useOnboardingState } from "@/lib/use-onboarding-state";

export default function JurisdictionScreen() {
  const jurisdiction = useOnboardingState((s) => s.draft.jurisdiction);
  const setDraft = useOnboardingState((s) => s.setDraft);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <OnboardingShell
        step="jurisdiction"
        title="Your jurisdiction?"
        subtitle="Optional. Pre-selects your calendar and parish search. You can always change it."
        skipLabel="Skip"
        onContinue={() => {
          if (jurisdiction) {
            setDraft(
              "calendarPreference",
              defaultCalendarForJurisdiction(jurisdiction),
            );
          }
        }}
      >
        {JURISDICTION_OPTIONS.map((opt) => (
          <OnboardingChoice
            key={opt.code}
            value={opt.code}
            label={opt.label}
            description={opt.description}
            selected={jurisdiction === opt.code}
            onSelect={(v) => setDraft("jurisdiction", v)}
          />
        ))}
      </OnboardingShell>
    </>
  );
}

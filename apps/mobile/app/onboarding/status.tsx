import { Stack } from "expo-router";
import { STATUS_OPTIONS } from "@theosis/core/onboarding";

import {
  OnboardingChoice,
  OnboardingShell,
} from "@/components/onboarding/onboarding-shell";
import { useOnboardingState } from "@/lib/use-onboarding-state";

export default function StatusScreen() {
  const status = useOnboardingState((s) => s.draft.status);
  const setDraft = useOnboardingState((s) => s.setDraft);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <OnboardingShell
        step="status"
        title="Where are you in the Faith?"
        subtitle="Helps us tailor your daily rhythm and what you see first."
        skipLabel="I'd rather not say"
      >
        {STATUS_OPTIONS.map((opt) => (
          <OnboardingChoice
            key={opt.value}
            value={opt.value}
            label={opt.label}
            description={opt.description}
            selected={status === opt.value}
            onSelect={(v) => setDraft("status", v)}
          />
        ))}
      </OnboardingShell>
    </>
  );
}

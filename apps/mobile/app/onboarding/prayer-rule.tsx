import { Stack } from "expo-router";
import { PRAYER_RULE_OPTIONS } from "@theosis/core/onboarding";

import {
  OnboardingChoice,
  OnboardingShell,
} from "@/components/onboarding/onboarding-shell";
import { useOnboardingState } from "@/lib/use-onboarding-state";

export default function PrayerRuleScreen() {
  const value = useOnboardingState((s) => s.draft.prayerRuleChoice);
  const setDraft = useOnboardingState((s) => s.setDraft);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <OnboardingShell
        step="prayer-rule"
        title="A prayer rule?"
        subtitle="A morning and evening order, ready to pray. Edit anything from the Prayer screen later."
      >
        {PRAYER_RULE_OPTIONS.map((opt) => (
          <OnboardingChoice
            key={opt.value}
            value={opt.value}
            label={opt.label}
            description={opt.description}
            selected={value === opt.value}
            onSelect={(v) => setDraft("prayerRuleChoice", v)}
          />
        ))}
      </OnboardingShell>
    </>
  );
}

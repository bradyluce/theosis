"use client";

import { PRAYER_RULE_OPTIONS } from "@theosis/core/onboarding";

import {
  OnboardingChoice,
  OnboardingShell,
} from "@/features/onboarding/onboarding-shell";
import { useOnboardingState } from "@/lib/user/use-onboarding-state";

export default function PrayerRulePage() {
  const value = useOnboardingState((s) => s.draft.prayerRuleChoice);
  const setDraft = useOnboardingState((s) => s.setDraft);

  return (
    <OnboardingShell
      step="prayer-rule"
      title="A prayer rule?"
      subtitle="A morning and evening order, ready to pray. You can edit anything from the Prayer screen later."
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
  );
}

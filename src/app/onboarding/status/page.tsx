"use client";

import { STATUS_OPTIONS } from "@theosis/core/onboarding";

import {
  OnboardingChoice,
  OnboardingShell,
} from "@/features/onboarding/onboarding-shell";
import { useOnboardingState } from "@/lib/user/use-onboarding-state";

export default function StatusPage() {
  const status = useOnboardingState((s) => s.draft.status);
  const setDraft = useOnboardingState((s) => s.setDraft);

  return (
    <OnboardingShell
      step="status"
      title="Where are you in the Faith?"
      subtitle="This helps tailor your daily rhythm and what you see on the home screen."
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
  );
}

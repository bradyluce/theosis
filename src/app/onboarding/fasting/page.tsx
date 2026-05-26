"use client";

import { FASTING_OPTIONS } from "@theosis/core/onboarding";

import {
  OnboardingChoice,
  OnboardingShell,
} from "@/features/onboarding/onboarding-shell";
import { useOnboardingState } from "@/lib/user/use-onboarding-state";

export default function FastingPage() {
  const status = useOnboardingState((s) => s.draft.status);
  const value = useOnboardingState((s) => s.draft.fastingLevel);
  const setDraft = useOnboardingState((s) => s.setDraft);
  // Default: relaxed for inquirers (who may not yet be fasting), standard
  // for everyone else.
  const selected = value ?? (status === "inquirer" ? "relaxed" : "standard");

  return (
    <OnboardingShell
      step="fasting"
      title="Fasting practice?"
      subtitle="This affects what the Daily page shows about fast and feast days. Display preference — your parish priest is the authority on what to actually keep."
    >
      {FASTING_OPTIONS.map((opt) => (
        <OnboardingChoice
          key={opt.value}
          value={opt.value}
          label={opt.label}
          description={opt.description}
          selected={selected === opt.value}
          onSelect={(v) => setDraft("fastingLevel", v)}
        />
      ))}
    </OnboardingShell>
  );
}

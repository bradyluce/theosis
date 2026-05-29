import { Stack } from "expo-router";
import { FASTING_OPTIONS } from "@theosis/core/onboarding";

import {
  OnboardingChoice,
  OnboardingShell,
} from "@/components/onboarding/onboarding-shell";
import { useOnboardingState } from "@/lib/use-onboarding-state";

export default function FastingScreen() {
  const status = useOnboardingState((s) => s.draft.status);
  const value = useOnboardingState((s) => s.draft.fastingLevel);
  const setDraft = useOnboardingState((s) => s.setDraft);
  const selected = value ?? (status === "inquirer" ? "relaxed" : "standard");

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <OnboardingShell
        step="fasting"
        illustration={require("../../assets/images/onboarding/fasting.webp")}
        title="Fasting practice?"
        subtitle="Affects what the Daily page shows about fast and feast days. Display preference — your priest is the authority on what to keep."
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
    </>
  );
}

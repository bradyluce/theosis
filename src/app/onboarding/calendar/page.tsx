"use client";

import { CALENDAR_OPTIONS } from "@theosis/core/onboarding";

import {
  OnboardingChoice,
  OnboardingShell,
} from "@/features/onboarding/onboarding-shell";
import { useOnboardingState } from "@/lib/user/use-onboarding-state";

export default function CalendarPage() {
  const value = useOnboardingState((s) => s.draft.calendarPreference);
  const setDraft = useOnboardingState((s) => s.setDraft);

  // Default to "new-calendar" if nothing has been selected yet (either by
  // user or by jurisdiction pre-fill).
  const selected = value ?? "new-calendar";

  return (
    <OnboardingShell
      step="calendar"
      title="Which calendar?"
      subtitle="The Daily commemorations and fasts follow whichever you pick. Almost all parishes in North America use the New Calendar."
    >
      {CALENDAR_OPTIONS.map((opt) => (
        <OnboardingChoice
          key={opt.value}
          value={opt.value}
          label={opt.label}
          description={opt.description}
          selected={selected === opt.value}
          onSelect={(v) => setDraft("calendarPreference", v)}
        />
      ))}
    </OnboardingShell>
  );
}

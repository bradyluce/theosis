"use client";

import {
  JURISDICTION_OPTIONS,
  defaultCalendarForJurisdiction,
} from "@theosis/core/onboarding";

import {
  OnboardingChoice,
  OnboardingShell,
} from "@/features/onboarding/onboarding-shell";
import { useOnboardingState } from "@/lib/user/use-onboarding-state";

export default function JurisdictionPage() {
  const jurisdiction = useOnboardingState((s) => s.draft.jurisdiction);
  const setDraft = useOnboardingState((s) => s.setDraft);

  return (
    <OnboardingShell
      step="jurisdiction"
      title="Your jurisdiction?"
      subtitle="Optional. Pre-selects your calendar and parish search. You can always change it."
      skipLabel="Skip"
      onContinue={() => {
        // Pre-select the calendar default — user can still override at the next step.
        if (jurisdiction) {
          setDraft(
            "calendarPreference",
            defaultCalendarForJurisdiction(jurisdiction),
          );
        }
      }}
    >
      <div className="max-h-[55vh] space-y-2 overflow-y-auto">
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
      </div>
    </OnboardingShell>
  );
}

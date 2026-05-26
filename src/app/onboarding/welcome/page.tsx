"use client";

import { OnboardingShell } from "@/features/onboarding/onboarding-shell";

export default function WelcomePage() {
  return (
    <OnboardingShell
      step="welcome"
      title="Welcome to Theosis"
      subtitle="A verse-first study companion for the Orthodox Christian tradition. Patristic commentary, daily liturgical rhythm, the Library of the Fathers."
    >
      <div className="space-y-2 rounded-2xl border border-line/40 bg-surface px-5 py-5 text-center">
        <p className="font-serif text-base text-ink">
          A few quick questions so the app feels yours.
        </p>
        <p className="text-xs leading-relaxed text-ink-muted">
          You can skip any step and revisit later in Settings.
        </p>
      </div>
    </OnboardingShell>
  );
}

"use client";

import { TRANSLATION_OPTIONS } from "@theosis/core/onboarding";

import {
  OnboardingChoice,
  OnboardingShell,
} from "@/features/onboarding/onboarding-shell";
import { useOnboardingState } from "@/lib/user/use-onboarding-state";

export default function TranslationPage() {
  const value = useOnboardingState((s) => s.draft.primaryTranslationId);
  const setDraft = useOnboardingState((s) => s.setDraft);
  const selected = value ?? "kjva";

  return (
    <OnboardingShell
      step="translation"
      title="Primary translation?"
      subtitle="This is the default text shown when you open the Bible reader. You can switch at any time."
    >
      {TRANSLATION_OPTIONS.map((opt) => (
        <OnboardingChoice
          key={opt.value}
          value={opt.value}
          label={opt.label}
          description={opt.description}
          selected={selected === opt.value}
          onSelect={(v) => setDraft("primaryTranslationId", v)}
        />
      ))}
      <p className="px-2 pt-2 text-xs leading-relaxed text-ink-soft">
        More translations (RSV, LXX, OSB) ship in a follow-up release.
      </p>
    </OnboardingShell>
  );
}

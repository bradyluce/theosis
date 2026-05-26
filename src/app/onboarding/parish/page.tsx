"use client";

import { useState } from "react";

import { OnboardingShell } from "@/features/onboarding/onboarding-shell";
import { useOnboardingState } from "@/lib/user/use-onboarding-state";

export default function ParishPage() {
  const parish = useOnboardingState((s) => s.draft.parish);
  const setDraft = useOnboardingState((s) => s.setDraft);
  const [input, setInput] = useState(parish ?? "");

  return (
    <OnboardingShell
      step="parish"
      title="Your parish?"
      subtitle="Where you worship. You can paste the name, or skip and pick from the parish locator later."
      skipLabel="Skip"
      onContinue={() => {
        const trimmed = input.trim();
        setDraft("parish", trimmed || null);
      }}
    >
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="e.g. Holy Trinity Cathedral, Chicago"
        className="w-full rounded-2xl border border-line/40 bg-surface px-5 py-3 font-mono text-sm text-ink placeholder:text-ink-soft focus:border-accent/50 focus:outline-none"
        autoComplete="off"
        autoCapitalize="words"
      />
      <p className="px-2 text-xs leading-relaxed text-ink-soft">
        Tip: open Settings → Parish later to switch to a structured pick from
        the parish locator.
      </p>
    </OnboardingShell>
  );
}

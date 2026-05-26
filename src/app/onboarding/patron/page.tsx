"use client";

import { useState } from "react";

import { OnboardingShell } from "@/features/onboarding/onboarding-shell";
import { useOnboardingState } from "@/lib/user/use-onboarding-state";

export default function PatronPage() {
  const patron = useOnboardingState((s) => s.draft.patronSaintSlug);
  const setDraft = useOnboardingState((s) => s.setDraft);
  const [input, setInput] = useState(patron ?? "");

  return (
    <OnboardingShell
      step="patron"
      title="A patron saint?"
      subtitle="The saint whose name you bear or whose intercession you've sought. Highlighted on the Daily page and ranks first in commentary."
      skipLabel="Skip — I'll choose later"
      onContinue={() => {
        const trimmed = input.trim();
        setDraft("patronSaintSlug", trimmed || null);
      }}
    >
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="john-chrysostom"
        className="w-full rounded-2xl border border-line/40 bg-surface px-5 py-3 font-mono text-sm text-ink placeholder:text-ink-soft focus:border-accent/50 focus:outline-none"
        autoComplete="off"
        autoCapitalize="none"
      />
      <p className="px-2 text-xs leading-relaxed text-ink-soft">
        Type the slug from the library URL (e.g. /library/people/john-chrysostom).
        A picker UI ships with Phase 4 — for now, paste the slug or skip.
      </p>
    </OnboardingShell>
  );
}

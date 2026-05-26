"use client";

// Shared frame for every onboarding step on web. Renders the centered
// card, progress dots (recomputed against the visible-step count for
// the current path — inquirers see 8 dots, others see 10), and the
// back / continue button row. Children render the step-specific
// content.

import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { type ReactNode } from "react";
import {
  type OnboardingStepId,
  ONBOARDING_STEPS,
  visibleStepCount,
} from "@theosis/core/onboarding";

import { useOnboardingState } from "@/lib/user/use-onboarding-state";
import { cn } from "@/lib/utils";

export type OnboardingShellProps = {
  step: OnboardingStepId;
  title: string;
  subtitle?: string;
  // Optional — true blocks the "Continue" button until satisfied (typical
  // for required steps). Skip-allowed steps can show a "Skip" link instead.
  canContinue?: boolean;
  // If provided, shown as "Skip" link in the bottom-right corner.
  skipLabel?: string;
  onContinue?: () => void;
  onSkip?: () => void;
  children: ReactNode;
};

export function OnboardingShell({
  step,
  title,
  subtitle,
  canContinue = true,
  skipLabel,
  onContinue,
  onSkip,
  children,
}: OnboardingShellProps) {
  const router = useRouter();
  const draft = useOnboardingState((s) => s.draft);
  const goNext = useOnboardingState((s) => s.goNext);
  const goPrev = useOnboardingState((s) => s.goPrev);

  const visibleSteps = ONBOARDING_STEPS.filter((s) => !s.skipWhen?.(draft));
  const currentIndex = visibleSteps.findIndex((s) => s.id === step);
  const total = visibleStepCount(draft);

  function handleContinue() {
    onContinue?.();
    // After step-specific handler, advance to next visible step.
    goNext();
    const nextId = useOnboardingState.getState().currentStep;
    if (nextId !== step) {
      router.push(`/onboarding/${nextId}`);
    }
  }

  function handleSkip() {
    onSkip?.();
    goNext();
    const nextId = useOnboardingState.getState().currentStep;
    if (nextId !== step) {
      router.push(`/onboarding/${nextId}`);
    }
  }

  function handleBack() {
    goPrev();
    const prevId = useOnboardingState.getState().currentStep;
    if (prevId !== step) {
      router.push(`/onboarding/${prevId}`);
    }
  }

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === total - 1;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Progress dots */}
      <div className="px-4 pt-4 sm:px-6 sm:pt-6">
        <div className="mx-auto flex max-w-md items-center justify-center gap-2">
          {visibleSteps.map((s, i) => (
            <span
              key={s.id}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors duration-300",
                i <= currentIndex ? "bg-accent" : "bg-line/40",
              )}
            />
          ))}
        </div>
        <p className="mt-3 text-center text-xs uppercase tracking-widest text-ink-soft">
          Step {currentIndex + 1} of {total}
        </p>
      </div>

      {/* Step content */}
      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-md space-y-6">
          <header className="space-y-2 text-center">
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="text-sm leading-relaxed text-ink-muted sm:text-base">
                {subtitle}
              </p>
            ) : null}
          </header>
          <div className="space-y-3">{children}</div>
        </div>
      </main>

      {/* Bottom nav row */}
      <footer className="border-t border-line/40 bg-surface px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleBack}
            disabled={isFirst}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-ink-muted transition-colors duration-200 hover:bg-surface-strong hover:text-ink",
              isFirst && "invisible",
            )}
            aria-label="Back"
          >
            <CaretLeft size={16} weight="bold" />
            Back
          </button>

          <div className="flex items-center gap-2">
            {skipLabel ? (
              <button
                type="button"
                onClick={handleSkip}
                className="rounded-full px-3 py-1.5 text-sm text-ink-soft underline underline-offset-2 hover:text-ink"
              >
                {skipLabel}
              </button>
            ) : null}
            {!isLast ? (
              <button
                type="button"
                onClick={handleContinue}
                disabled={!canContinue}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full bg-accent px-5 py-2 text-sm font-medium text-background transition-opacity duration-200 hover:opacity-90 disabled:opacity-40",
                )}
              >
                Continue
                <CaretRight size={16} weight="bold" />
              </button>
            ) : null}
          </div>
        </div>
      </footer>
    </div>
  );
}

// Helper: shared radio-card row used by status / jurisdiction / fasting /
// calendar / translation steps. Renders a tappable card with a label,
// optional description, and a check glyph when selected.
export function OnboardingChoice<T extends string>({
  value,
  label,
  description,
  selected,
  onSelect,
}: {
  value: T;
  label: string;
  description?: string;
  selected: boolean;
  onSelect: (value: T) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={cn(
        "flex w-full items-start justify-between gap-3 rounded-2xl border bg-surface px-5 py-4 text-left transition-colors duration-200",
        selected
          ? "border-accent/50 bg-accent-soft"
          : "border-line/40 hover:bg-surface-strong",
      )}
      aria-pressed={selected}
    >
      <div className="space-y-1">
        <p
          className={cn(
            "font-serif text-base text-ink",
            selected && "text-accent",
          )}
        >
          {label}
        </p>
        {description ? (
          <p className="text-xs leading-relaxed text-ink-muted">{description}</p>
        ) : null}
      </div>
      {selected ? (
        <span className="font-serif text-lg text-accent">✓</span>
      ) : null}
    </button>
  );
}

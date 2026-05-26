"use client";

// Onboarding draft + navigation slice. Persisted to localStorage so a mid-
// flow reload (or a redirect to /sign-up and back) doesn't lose answers.
// On commit(): applies the draft to useStudyState's preferences,
// triggers profile.patch sync, and flips onboardingStatus to "complete".

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  OnboardingDraft,
  OnboardingStepId,
} from "@theosis/core/onboarding";
import {
  nextStep as nextStepCore,
  prevStep as prevStepCore,
} from "@theosis/core/onboarding";

import { useStudyState } from "@/lib/user/use-study-state";

type OnboardingState = {
  currentStep: OnboardingStepId;
  draft: OnboardingDraft;
  setDraft: <K extends keyof OnboardingDraft>(
    key: K,
    value: OnboardingDraft[K],
  ) => void;
  goNext: () => void;
  goPrev: () => void;
  jumpTo: (step: OnboardingStepId) => void;
  reset: () => void;
  commit: () => void;
};

const INITIAL_DRAFT: OnboardingDraft = {};

export const useOnboardingState = create<OnboardingState>()(
  persist(
    (set, get) => ({
      currentStep: "welcome",
      draft: INITIAL_DRAFT,
      setDraft: (key, value) =>
        set((s) => ({ draft: { ...s.draft, [key]: value } })),
      goNext: () => {
        const { currentStep, draft } = get();
        const next = nextStepCore(currentStep, draft);
        if (next) set({ currentStep: next });
      },
      goPrev: () => {
        const { currentStep, draft } = get();
        const prev = prevStepCore(currentStep, draft);
        if (prev) set({ currentStep: prev });
      },
      jumpTo: (step) => set({ currentStep: step }),
      reset: () => set({ currentStep: "welcome", draft: INITIAL_DRAFT }),
      commit: () => {
        const { draft } = get();
        const study = useStudyState.getState();

        // Apply each draft field via setPreference (which also emits the
        // server profile.patch). Status / jurisdiction / etc. are local
        // string fields; we trust the draft's type-checking already.
        if (draft.status !== undefined)
          study.setPreference("status", draft.status);
        if (draft.jurisdiction !== undefined)
          study.setPreference("jurisdiction", draft.jurisdiction);
        if (draft.parish !== undefined)
          study.setPreference("parish", draft.parish);
        if (draft.parishId !== undefined)
          study.setPreference("parishId", draft.parishId);
        if (draft.calendarPreference !== undefined)
          study.setPreference("calendarPreference", draft.calendarPreference);
        if (draft.primaryTranslationId !== undefined)
          study.setPreference("primaryTranslationId", draft.primaryTranslationId);
        if (draft.fastingLevel !== undefined)
          study.setPreference("fastingLevel", draft.fastingLevel);
        if (draft.commentaryRanking !== undefined)
          study.setPreference("commentaryRanking", draft.commentaryRanking);
        if (draft.textSize !== undefined)
          study.setPreference("textSize", draft.textSize);
        if (draft.patronSaintSlug !== undefined)
          study.setPatronSaint(draft.patronSaintSlug ?? "");

        // Prayer rule is a Phase 4 surface on web; for now record the
        // intent locally so Settings can show "Starter rule selected"
        // until the Prayer screen lands.
        // (No setter for prayer rule on web yet — defer to Phase 4.)

        study.setOnboardingStatus("complete");

        // Reset the draft so a future "walk through setup again" starts
        // fresh.
        set({ currentStep: "welcome", draft: INITIAL_DRAFT });
      },
    }),
    {
      name: "theosis-onboarding",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);

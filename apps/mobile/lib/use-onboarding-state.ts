// Mobile onboarding draft + navigation slice. Mirrors web's
// src/lib/user/use-onboarding-state.ts, persisted to AsyncStorage so
// answers survive backgrounding or app restart.
//
// On commit(): applies the draft to mobile's preferences module via
// updateProfilePrefs (which itself emits a server-sync patch when the
// user is signed in), then flips the local onboarding status to
// "complete".

import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  OnboardingDraft,
  OnboardingStepId,
} from "@theosis/core/onboarding";
import {
  nextStep as nextStepCore,
  prevStep as prevStepCore,
} from "@theosis/core/onboarding";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { setOnboardingStatus, updateProfilePrefs } from "./preferences";

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
  commit: () => Promise<void>;
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
      commit: async () => {
        const { draft } = get();
        // Translate the unified onboarding draft → mobile's ProfilePrefs
        // shape. The unified server-side shape uses canonical names; mobile's
        // ProfilePrefs predates them.
        //
        // This block has to mention every field the onboarding flow can
        // set — otherwise the user's answer is silently dropped after a
        // 10-step walkthrough. Currently covered:
        //   status, parish, patronSaintSlug, calendarPreference,
        //   commentaryRanking, jurisdiction, fastingLevel,
        //   primaryTranslationId, textSize.
        // Prayer-rule choice is handled by the builder seeding logic
        // (not a profile field).
        const patch: Parameters<typeof updateProfilePrefs>[0] = {};
        if (draft.status === "orthodox") patch.status = "christian";
        else if (draft.status === "catechumen") patch.status = "catechumen";
        else if (draft.status === "inquirer") patch.status = "inquirer";
        if (draft.parish !== undefined) patch.parish = draft.parish ?? undefined;
        if (draft.patronSaintSlug !== undefined)
          patch.patronSaintSlug = draft.patronSaintSlug ?? undefined;
        if (draft.calendarPreference === "old-calendar")
          patch.calendarSystem = "julian";
        else if (draft.calendarPreference === "new-calendar")
          patch.calendarSystem = "new";
        if (draft.commentaryRanking !== undefined)
          patch.commentaryRanking = draft.commentaryRanking;
        if (draft.jurisdiction !== undefined)
          patch.jurisdiction = draft.jurisdiction;
        if (draft.fastingLevel !== undefined)
          patch.fastingLevel = draft.fastingLevel;
        if (draft.primaryTranslationId !== undefined)
          patch.primaryTranslationId = draft.primaryTranslationId;
        if (draft.textSize !== undefined) patch.textSize = draft.textSize;
        await updateProfilePrefs(patch);
        await setOnboardingStatus("complete");
        set({ currentStep: "welcome", draft: INITIAL_DRAFT });
      },
    }),
    {
      name: "theosis-onboarding-mobile",
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    },
  ),
);

// Canonical onboarding step definitions, shared between web and mobile.
// Both platforms render their own screens but agree on:
//   - The order of steps
//   - The skip semantics
//   - Conditional visibility (e.g. parish step skipped for inquirers)
//   - The draft shape that accumulates as the user clicks through

import type { Jurisdiction } from "../domain/types";
import type {
  CommentaryRanking,
  FastingLevel,
  TextSize,
  UserStatus,
} from "../domain/user-types";

export type OnboardingStepId =
  | "welcome"
  | "status"
  | "jurisdiction"
  | "parish"
  | "calendar"
  | "translation"
  | "fasting"
  | "patron"
  | "prayer-rule"
  | "notifications"
  | "sign-in";

export type OnboardingDraft = {
  status?: UserStatus;
  jurisdiction?: Jurisdiction;
  parish?: string | null;
  parishId?: string | null;
  calendarPreference?: "new-calendar" | "old-calendar";
  primaryTranslationId?: string;
  fastingLevel?: FastingLevel;
  patronSaintSlug?: string | null;
  commentaryRanking?: CommentaryRanking;
  textSize?: TextSize;
  // Prayer-rule choice: "starter" applies the bundled rule on commit;
  // "skip" leaves the rule empty; "custom" defers to the rule builder.
  prayerRuleChoice?: "starter" | "skip" | "custom";
  // True = user accepted sign-in step. False/undefined = continuing as guest.
  signedIn?: boolean;
};

export type OnboardingStep = {
  id: OnboardingStepId;
  // Visible position in the progress dots. Conditional steps share their
  // position so the dot count doesn't visibly jump when an inquirer skips
  // jurisdiction/parish.
  index: number;
  // Total visible step count for the user's path. Used to render "3 of 9".
  // (Recomputed against the actual draft — inquirer paths are shorter.)
  // Skip predicate: true means "this step shouldn't be shown given the
  // current draft". Used by the state machine's next()/prev() to leap over
  // skipped steps.
  skipWhen?: (draft: OnboardingDraft) => boolean;
};

// Device-only capability flag. The "notifications" step configures on-device
// local reminders (expo-notifications), which only exist in the mobile app.
// Mobile calls setDeviceNotificationsSupported(true) at startup; web never
// does, so the step's skipWhen leaves it out of the web flow entirely — no
// orphan route, correct dot count, correct next/prev. Module-level mutable
// state is intentional here: it's a one-time platform capability switch, not
// per-user data, and reads the same on a given platform across SSR + client.
let deviceNotificationsSupported = false;

export function setDeviceNotificationsSupported(supported: boolean): void {
  deviceNotificationsSupported = supported;
}

export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  { id: "welcome", index: 1 },
  { id: "status", index: 2 },
  {
    id: "jurisdiction",
    index: 3,
    // Inquirers haven't picked a jurisdiction — skip both jurisdiction and
    // parish steps for them.
    skipWhen: (draft) => draft.status === "inquirer",
  },
  {
    id: "parish",
    index: 4,
    skipWhen: (draft) => draft.status === "inquirer",
  },
  { id: "calendar", index: 5 },
  { id: "translation", index: 6 },
  { id: "fasting", index: 7 },
  { id: "patron", index: 8 },
  { id: "prayer-rule", index: 9 },
  {
    id: "notifications",
    index: 10,
    // Mobile-only — see setDeviceNotificationsSupported above.
    skipWhen: () => !deviceNotificationsSupported,
  },
  { id: "sign-in", index: 11 },
];

// Total visible steps given a draft. Web (no device notifications): 10 for an
// orthodox/catechumen, 8 for an inquirer (jurisdiction + parish skipped).
// Mobile adds the notifications step (+1 to each).
export function visibleStepCount(draft: OnboardingDraft): number {
  return ONBOARDING_STEPS.filter((s) => !s.skipWhen?.(draft)).length;
}

// Next/prev helpers — given the current step id and the draft, return the
// adjacent visible step id (or null if at the boundary).
export function nextStep(
  current: OnboardingStepId,
  draft: OnboardingDraft,
): OnboardingStepId | null {
  const idx = ONBOARDING_STEPS.findIndex((s) => s.id === current);
  if (idx < 0) return null;
  for (let i = idx + 1; i < ONBOARDING_STEPS.length; i++) {
    const candidate = ONBOARDING_STEPS[i];
    if (!candidate.skipWhen?.(draft)) return candidate.id;
  }
  return null;
}

export function prevStep(
  current: OnboardingStepId,
  draft: OnboardingDraft,
): OnboardingStepId | null {
  const idx = ONBOARDING_STEPS.findIndex((s) => s.id === current);
  if (idx <= 0) return null;
  for (let i = idx - 1; i >= 0; i--) {
    const candidate = ONBOARDING_STEPS[i];
    if (!candidate.skipWhen?.(draft)) return candidate.id;
  }
  return null;
}

// Jurisdiction → default calendar mapping. Used to pre-select the calendar
// step. Users can still override.
export function defaultCalendarForJurisdiction(
  jurisdiction: Jurisdiction | undefined,
): "new-calendar" | "old-calendar" {
  // Old Calendar jurisdictions (Russian Orthodox tradition + a few others).
  if (
    jurisdiction === "roc" ||
    jurisdiction === "mos" ||
    jurisdiction === "ser" ||
    jurisdiction === "bgr"
  ) {
    return "old-calendar";
  }
  // Everything else defaults to New Calendar (Revised Julian).
  return "new-calendar";
}

// Static labels for the jurisdiction picker. Order = Assembly of Canonical
// Orthodox Bishops convention.
export const JURISDICTION_OPTIONS: readonly {
  code: Jurisdiction;
  label: string;
  description: string;
}[] = [
  { code: "oca", label: "OCA", description: "Orthodox Church in America" },
  { code: "goa", label: "GOA", description: "Greek Orthodox Archdiocese of America" },
  { code: "ant", label: "Antiochian", description: "Antiochian Orthodox Christian Archdiocese" },
  { code: "roc", label: "ROCOR", description: "Russian Orthodox Church Outside Russia" },
  { code: "rom", label: "Romanian", description: "Romanian Orthodox Episcopate" },
  { code: "ser", label: "Serbian", description: "Serbian Orthodox Church" },
  { code: "ukr", label: "Ukrainian", description: "Ukrainian Orthodox Church (USA)" },
  { code: "mos", label: "Moscow", description: "Moscow Patriarchate" },
  { code: "bgr", label: "Bulgarian", description: "Bulgarian Orthodox Diocese" },
  { code: "alb", label: "Albanian", description: "Albanian Orthodox Diocese" },
  { code: "cpr", label: "Carpatho-Russian", description: "American Carpatho-Russian Orthodox Diocese" },
  { code: "geo", label: "Georgian", description: "Georgian Apostolic Orthodox Church" },
  { code: "other", label: "Other / Not sure", description: "" },
];

// Status options — copy lifted from apps/mobile/app/settings.tsx.
export const STATUS_OPTIONS: readonly {
  value: UserStatus;
  label: string;
  description: string;
}[] = [
  {
    value: "orthodox",
    label: "Orthodox Christian",
    description: "Already received into the Orthodox Church.",
  },
  {
    value: "catechumen",
    label: "Catechumen",
    description: "Preparing for reception into the Church.",
  },
  {
    value: "inquirer",
    label: "Inquirer",
    description: "Exploring Orthodoxy and learning the faith.",
  },
];

// Fasting-level options. Display-intent, not canonical prescription —
// jurisdictions and parish practices vary.
export const FASTING_OPTIONS: readonly {
  value: FastingLevel;
  label: string;
  description: string;
}[] = [
  {
    value: "strict",
    label: "Strict",
    description: "Full traditional fast: weekly Wed/Fri plus the four seasons.",
  },
  {
    value: "standard",
    label: "Standard",
    description: "Wed/Fri and the four seasonal fasts. Standard lay practice.",
  },
  {
    value: "relaxed",
    label: "Relaxed",
    description: "Only the four great fasts (Great Lent, Nativity, Apostles', Dormition).",
  },
];

// Calendar options — same copy mobile already uses.
export const CALENDAR_OPTIONS: readonly {
  value: "new-calendar" | "old-calendar";
  label: string;
  description: string;
}[] = [
  {
    value: "new-calendar",
    label: "New (Revised Julian)",
    description: "OCA, GOARCH, Antiochian US — most parishes worldwide.",
  },
  {
    value: "old-calendar",
    label: "Old (Julian)",
    description: "ROCOR, Athonite, Russian/Serbian tradition.",
  },
];

// Translation options — every translation present in
// content/normalized/bibles/catalog.json that an English-speaking
// Orthodox reader is likely to pick as their daily Bible. Greek and
// Hebrew witnesses (GNT, BYZ, ANT 1904, WLC) are left out of the
// selector because they're side-by-side reference texts, not primary
// reading. The Bible reader still surfaces every translation in the
// per-screen translation switcher; this list is the curated "use as
// my default" set.
export const TRANSLATION_OPTIONS: readonly {
  value: string;
  label: string;
  description: string;
}[] = [
  {
    value: "kjva",
    label: "KJV with Apocrypha",
    description:
      "King James Version including the Deuterocanonicals. Public domain. The default if you're unsure.",
  },
  {
    value: "lxxe",
    label: "Brenton's Septuagint",
    description:
      "English translation of the Septuagint — the Old Testament the Apostles and Fathers cite.",
  },
  {
    value: "dra",
    label: "Douay-Rheims (Challoner)",
    description:
      "English translation from the Latin Vulgate, full canon including the Deuterocanonicals.",
  },
  {
    value: "web",
    label: "World English Bible",
    description:
      "Modern public-domain English (Apocrypha edition). Easier reading than the KJV register.",
  },
];

// Prayer rule choices.
export const PRAYER_RULE_OPTIONS: readonly {
  value: "starter" | "skip" | "custom";
  label: string;
  description: string;
}[] = [
  {
    value: "starter",
    label: "Use the starter rule",
    description: "Trisagion, Lord's Prayer, the Symbol of Faith, and a brief reading. Edit later in Settings.",
  },
  {
    value: "custom",
    label: "I'll build my own",
    description: "Skip ahead — set up your rule from the Prayer screen when you're ready.",
  },
  {
    value: "skip",
    label: "Skip for now",
    description: "No rule. You can add one any time from Settings.",
  },
];

import { Stack } from "expo-router";
import { CALENDAR_OPTIONS } from "@theosis/core/onboarding";

import {
  OnboardingChoice,
  OnboardingShell,
} from "@/components/onboarding/onboarding-shell";
import { useOnboardingState } from "@/lib/use-onboarding-state";

export default function CalendarScreen() {
  const value = useOnboardingState((s) => s.draft.calendarPreference);
  const setDraft = useOnboardingState((s) => s.setDraft);
  const selected = value ?? "new-calendar";

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <OnboardingShell
        step="calendar"
        illustration={require("../../assets/images/onboarding/whichcalendar.jpg")}
        title="Which calendar?"
        subtitle="Most North American parishes use the New Calendar. ROCOR, Athonite, and many Slavic traditions keep the Old."
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
    </>
  );
}

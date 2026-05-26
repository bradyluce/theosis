import { Stack } from "expo-router";
import { StyleSheet, Text } from "react-native";
import { TRANSLATION_OPTIONS } from "@theosis/core/onboarding";

import {
  OnboardingChoice,
  OnboardingShell,
} from "@/components/onboarding/onboarding-shell";
import { colors, spacing } from "@/constants/theosis-theme";
import { useOnboardingState } from "@/lib/use-onboarding-state";

export default function TranslationScreen() {
  const value = useOnboardingState((s) => s.draft.primaryTranslationId);
  const setDraft = useOnboardingState((s) => s.setDraft);
  const selected = value ?? "kjva";

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <OnboardingShell
        step="translation"
        title="Primary translation?"
        subtitle="Default text in the Bible reader. You can switch any time."
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
        <Text style={styles.hint}>
          More translations (RSV, LXX, OSB) ship in a follow-up release.
        </Text>
      </OnboardingShell>
    </>
  );
}

const styles = StyleSheet.create({
  hint: {
    fontSize: 12,
    color: colors.inkSoft,
    paddingHorizontal: spacing.xs,
    lineHeight: 18,
  },
});

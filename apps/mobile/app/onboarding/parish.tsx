import { Stack } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { colors, fonts, radii, spacing } from "@/constants/theosis-theme";
import { useOnboardingState } from "@/lib/use-onboarding-state";

export default function ParishScreen() {
  const parish = useOnboardingState((s) => s.draft.parish);
  const setDraft = useOnboardingState((s) => s.setDraft);
  const [input, setInput] = useState(parish ?? "");

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <OnboardingShell
        step="parish"
        title="Your parish?"
        subtitle="Where you worship. Paste the name, or skip and pick from the parish locator later."
        skipLabel="Skip"
        onContinue={() => {
          setDraft("parish", input.trim() || null);
        }}
      >
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="e.g. Holy Trinity Cathedral, Chicago"
          placeholderTextColor={colors.inkSoft}
          autoCapitalize="words"
          style={styles.input}
        />
        <View style={styles.hintBlock}>
          <Text style={styles.hint}>
            Tip: open Settings → Parish later to switch to a structured pick.
          </Text>
        </View>
      </OnboardingShell>
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.ink,
    fontFamily: fonts.mono,
    fontSize: 15,
  },
  hintBlock: { paddingHorizontal: spacing.xs },
  hint: {
    fontSize: 12,
    color: colors.inkSoft,
    lineHeight: 18,
  },
});

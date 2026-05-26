import { Stack } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { colors, fonts, radii, spacing } from "@/constants/theosis-theme";
import { useOnboardingState } from "@/lib/use-onboarding-state";

export default function PatronScreen() {
  const patron = useOnboardingState((s) => s.draft.patronSaintSlug);
  const setDraft = useOnboardingState((s) => s.setDraft);
  const [input, setInput] = useState(patron ?? "");

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <OnboardingShell
        step="patron"
        title="A patron saint?"
        subtitle="The saint whose name you bear or whose intercession you've sought. Highlighted on Daily and ranks first in commentary."
        skipLabel="Skip — I'll choose later"
        onContinue={() => {
          setDraft("patronSaintSlug", input.trim() || null);
        }}
      >
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="john-chrysostom"
          placeholderTextColor={colors.inkSoft}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
        <View>
          <Text style={styles.hint}>
            Paste the slug from the library URL (e.g. /people/john-chrysostom).
            A picker UI ships with Phase 4 — for now, type the slug or skip.
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
  hint: {
    fontSize: 12,
    color: colors.inkSoft,
    paddingHorizontal: spacing.xs,
    lineHeight: 18,
  },
});

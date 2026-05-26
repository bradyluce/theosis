import { Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { colors, fonts, radii, spacing } from "@/constants/theosis-theme";

export default function WelcomeScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <OnboardingShell
        step="welcome"
        title="Welcome to Theosis"
        subtitle="A verse-first study companion for the Orthodox Christian tradition. Patristic commentary, daily liturgical rhythm, the Library of the Fathers."
      >
        <View style={styles.card}>
          <Text style={styles.lead}>
            A few quick questions so the app feels yours.
          </Text>
          <Text style={styles.hint}>
            You can skip any step and revisit later in Settings.
          </Text>
        </View>
      </OnboardingShell>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
    alignItems: "center",
  },
  lead: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.ink,
    textAlign: "center",
  },
  hint: {
    fontSize: 12,
    color: colors.inkMuted,
    textAlign: "center",
  },
});

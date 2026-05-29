import { Image } from "expo-image";
import { Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { colors, fonts, radii, spacing } from "@/constants/theosis-theme";

// Bundled at build time so the opening screen renders instantly offline.
const WELCOME_IMAGE = require("../../assets/images/onboarding-welcome.webp");

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

        {/* Resurrection icon — fills the opening screen and sets the tone
            before the questions begin. */}
        <Image
          source={WELCOME_IMAGE}
          style={styles.icon}
          contentFit="cover"
          transition={260}
          accessibilityLabel="Icon of the Resurrection of Christ"
        />
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
  icon: {
    width: "100%",
    aspectRatio: 2000 / 2800,
    borderRadius: radii.card,
    marginTop: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
    backgroundColor: colors.surface,
  },
});

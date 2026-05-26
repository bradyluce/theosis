import { SignedIn, SignedOut } from "@clerk/clerk-expo";
import { Stack, router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { colors, fonts, radii, spacing } from "@/constants/theosis-theme";
import { useOnboardingState } from "@/lib/use-onboarding-state";

export default function SignInScreen() {
  const commit = useOnboardingState((s) => s.commit);

  async function finish() {
    await commit();
    router.replace("/(tabs)");
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <OnboardingShell
        step="sign-in"
        title="Save your progress?"
        subtitle="Sign in to keep your highlights, notes, and reading list across devices. Or continue as a guest — you can sign in any time."
      >
        <SignedOut>
          <View style={styles.choices}>
            <Pressable
              onPress={() => router.push("/auth-debug")}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text style={styles.primaryLabel}>Sign in / Sign up</Text>
            </Pressable>
            <Pressable
              onPress={finish}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.secondaryLabel}>Continue as guest</Text>
            </Pressable>
          </View>
        </SignedOut>
        <SignedIn>
          <View style={styles.signedInCard}>
            <Text style={styles.signedInTitle}>✓ Signed in. Progress will sync.</Text>
            <Pressable
              onPress={finish}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text style={styles.primaryLabel}>Enter the app</Text>
            </Pressable>
          </View>
        </SignedIn>
      </OnboardingShell>
    </>
  );
}

const styles = StyleSheet.create({
  choices: { gap: spacing.sm },
  primaryButton: {
    borderRadius: radii.card,
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  primaryLabel: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.background,
    fontWeight: "600",
  },
  secondaryButton: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  secondaryLabel: {
    fontFamily: fonts.serif,
    fontSize: 15,
    color: colors.inkMuted,
  },
  signedInCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(212, 168, 87, 0.5)",
    backgroundColor: colors.accentSoft,
    alignItems: "center",
  },
  signedInTitle: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.accent,
  },
});

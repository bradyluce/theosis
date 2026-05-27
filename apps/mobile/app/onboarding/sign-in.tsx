// Last onboarding step. Two paths:
//   - "Sign in / Sign up" → pushes /auth-debug, which holds the actual
//     OAuth + email forms. When Clerk fires isSignedIn=true, we auto-
//     commit the onboarding draft and replace the route into /(tabs)
//     so the user never sees this screen again.
//   - "Continue as guest" → commits the draft as anonymous, replaces
//     into /(tabs).
//
// The auto-redirect is the important bit: the user explicitly called
// out the "weird page" where they had to tap "Enter the app" after
// authenticating. The effect below watches useAuth and finishes the
// flow the instant Clerk reports a session.

import { useAuth } from "@clerk/clerk-expo";
import { Stack, router } from "expo-router";
import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { colors, fonts, radii, spacing } from "@/constants/theosis-theme";
import { useOnboardingState } from "@/lib/use-onboarding-state";

export default function SignInScreen() {
  const commit = useOnboardingState((s) => s.commit);
  const { isSignedIn, isLoaded } = useAuth();
  // One-shot guard so we don't fire commit() twice if the auth state
  // briefly flips during the Clerk session attach.
  const finishedRef = useRef(false);

  async function finish() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    await commit();
    router.replace("/(tabs)");
  }

  // Auto-redirect when the user comes back from /auth-debug already
  // signed in. The dependency on isLoaded keeps us from triggering
  // during Clerk's initial hydration when isSignedIn is briefly
  // false-positive.
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      void finish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <OnboardingShell
        step="sign-in"
        title="Save your progress?"
        subtitle="Sign in to keep your highlights, notes, and reading list across devices. Or continue as a guest — you can sign in any time."
      >
        <View style={styles.choices}>
          <Pressable
            onPress={() => router.push("/auth-debug")}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && { opacity: 0.9 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Sign in or sign up"
          >
            <Text style={styles.primaryLabel}>Sign in / Sign up</Text>
          </Pressable>
          <Pressable
            onPress={() => void finish()}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Continue as guest"
          >
            <Text style={styles.secondaryLabel}>Continue as guest</Text>
          </Pressable>
        </View>
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
});

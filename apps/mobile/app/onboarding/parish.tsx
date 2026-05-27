// Onboarding parish step. Mirrors the patron-saint step: opens the
// real parish locator (/parishes) instead of accepting a free-text
// blob. The locator writes the picked parish directly to prefs, so
// we re-read on focus and mirror the value into the onboarding draft
// when the user taps Continue.

import Feather from "@expo/vector-icons/Feather";
import { Stack, router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { colors, fonts, radii, spacing } from "@/constants/theosis-theme";
import { getProfilePrefs } from "@/lib/preferences";
import { useOnboardingState } from "@/lib/use-onboarding-state";

export default function ParishScreen() {
  const setDraft = useOnboardingState((s) => s.setDraft);
  const [parish, setParish] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let canceled = false;
      void getProfilePrefs().then((p) => {
        if (!canceled) setParish(p.parish ?? null);
      });
      return () => {
        canceled = true;
      };
    }, []),
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <OnboardingShell
        step="parish"
        title="Your parish?"
        subtitle="Where you worship on Sundays. Pick from the locator — search by ZIP or jurisdiction. Skip and add it later from Settings."
        skipLabel="Skip — I'll add it later"
        onContinue={() => {
          setDraft("parish", parish);
        }}
      >
        <Pressable
          onPress={() => router.push("/parishes")}
          style={({ pressed }) => [
            styles.tile,
            pressed && { backgroundColor: colors.surfaceStrong },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Find your parish"
        >
          <View style={styles.iconWrap}>
            <Feather
              name={parish ? "map-pin" : "search"}
              size={20}
              color={colors.accent}
            />
          </View>
          <View style={styles.main}>
            {parish ? (
              <>
                <Text style={styles.tileLabel} numberOfLines={1}>
                  {parish}
                </Text>
                <Text style={styles.tileDescription} numberOfLines={1}>
                  Tap to change.
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.tileLabel}>Find your parish</Text>
                <Text style={styles.tileDescription}>
                  Search nearby Orthodox churches and pick yours.
                </Text>
              </>
            )}
          </View>
          <Feather name="chevron-right" size={16} color={colors.inkSoft} />
        </Pressable>
      </OnboardingShell>
    </>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
    alignItems: "center",
    justifyContent: "center",
  },
  main: { flex: 1, gap: 2 },
  tileLabel: {
    fontFamily: fonts.serif,
    fontSize: 17,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  tileDescription: {
    fontSize: 12,
    color: colors.inkMuted,
    fontStyle: "italic",
  },
});

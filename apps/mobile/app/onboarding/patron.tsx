// Onboarding patron-saint step. Opens the same searchable picker used in
// Settings (no typing a slug). Re-reads the patron from prefs on focus so
// the value updates as soon as the picker pops back.

import { useQuery } from "@tanstack/react-query";
import Feather from "@expo/vector-icons/Feather";
import { Image } from "expo-image";
import { Stack, router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { colors, fonts, radii, spacing } from "@/constants/theosis-theme";
import { getApi } from "@/lib/api";
import { getProfilePrefs } from "@/lib/preferences";
import { useOnboardingState } from "@/lib/use-onboarding-state";

export default function PatronScreen() {
  const setDraft = useOnboardingState((s) => s.setDraft);
  const [patronSlug, setPatronSlug] = useState<string | null>(null);

  // Re-read from prefs on focus — the saint-picker writes directly to
  // updateProfilePrefs(), so when we come back from the modal the new
  // value is already persisted.
  useFocusEffect(
    useCallback(() => {
      let canceled = false;
      void getProfilePrefs().then((p) => {
        if (!canceled) setPatronSlug(p.patronSaintSlug ?? null);
      });
      return () => {
        canceled = true;
      };
    }, []),
  );

  const api = getApi();
  const peopleQuery = useQuery({
    queryKey: ["library-people"],
    queryFn: () => api.fetchLibraryPeople(),
    staleTime: 60 * 60 * 1000,
    enabled: !!patronSlug,
  });
  const current = patronSlug
    ? peopleQuery.data?.people.find((p) => p.slug === patronSlug)
    : null;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <OnboardingShell
        step="patron"
        illustration={require("../../assets/images/onboarding/patronsaint.jpg")}
        title="A patron saint?"
        subtitle="The saint whose name you bear or whose intercession you've sought. Highlighted on Daily; ranks first in commentary."
        skipLabel="Skip — I'll choose later"
        onContinue={() => {
          // Mirror the picked value into the draft so the onboarding
          // commit() routine has it (the picker already wrote it to
          // prefs, but draft is the canonical onboarding hand-off).
          setDraft("patronSaintSlug", patronSlug);
        }}
      >
        <Pressable
          onPress={() => router.push("/saint-picker")}
          style={({ pressed }) => [
            styles.tile,
            pressed && { backgroundColor: colors.surfaceStrong },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Choose patron saint"
        >
          <View style={styles.avatar}>
            {current?.icon ? (
              <Image
                source={{ uri: current.icon.src }}
                style={styles.avatarImage}
                contentFit="cover"
                transition={140}
              />
            ) : (
              <Text style={styles.avatarLetter}>
                {current?.name?.charAt(0) ?? "?"}
              </Text>
            )}
          </View>
          <View style={styles.tileMain}>
            {current ? (
              <>
                <Text style={styles.tileLabel} numberOfLines={1}>
                  {current.honorific
                    ? `${current.honorific} ${current.name.split(",")[0]}`
                    : current.name.split(",")[0]}
                </Text>
                <Text style={styles.tileDescription} numberOfLines={1}>
                  {[current.eraLabel, current.feastDayLabel]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.tileLabel}>Choose a patron saint</Text>
                <Text style={styles.tileDescription}>
                  Search by name, era, or feast day.
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
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%" },
  avatarLetter: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 22,
    color: colors.accent,
  },
  tileMain: { flex: 1, gap: 2 },
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

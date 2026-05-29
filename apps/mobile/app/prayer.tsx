import { useQuery } from "@tanstack/react-query";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LinearGradient } from "expo-linear-gradient";
import type { DailyResponse } from "@theosis/core";

import { Eyebrow, GiltRule } from "@/components/theosis/primitives";
import { Pill } from "@/components/theosis/pill";
import { colors, fonts, radii, spacing, text } from "@/constants/theosis-theme";
import { getApi } from "@/lib/api";
import {
  type PrayerRule,
  getPrayerRule,
  setPrayerRule,
} from "@/lib/preferences";
import {
  DYNAMIC_BY_ID,
  PRAYER_BY_ID,
  STARTER_RULE,
  type DynamicItem,
  type PrayerEntry,
} from "@/lib/prayer-corpus";

// Prayer Rule — Morning / Evening tabs. Read-only view.
//
// Renders the configured prayers as a top-to-bottom list. Dynamic items
// (gospel-of-day, epistle-of-day, appointed psalm) pull live from
// /api/daily, which the user can do once per day.
//
// Editing is unified through the full builder at /prayer-builder — the
// same screen Settings opens — so there's a single place to add, remove,
// reorder, and export the rule. The "Edit" action here just routes there.
//
// First launch: if the saved rule has !initialized, we write the
// STARTER_RULE so the user opens to a working compact rule (Trisagion,
// Lord's Prayer, etc.) rather than an empty page.

type Slot = "morning" | "evening";

export default function PrayerScreen() {
  const params = useLocalSearchParams<{ slot?: string }>();
  const initialSlot: Slot = params.slot === "evening" ? "evening" : "morning";
  const [slot, setSlot] = useState<Slot>(initialSlot);
  const [rule, setRule] = useState<PrayerRule | null>(null);

  const api = getApi();
  // Daily readings power the gospel-of-day / epistle-of-day dynamic items.
  // Cached for an hour — the lectionary doesn't change mid-session.
  const dailyQuery = useQuery({
    queryKey: ["daily"],
    queryFn: () => api.fetchDaily(),
    staleTime: 60 * 60 * 1000,
  });

  // Initial rule load + first-launch seeding with STARTER_RULE.
  const refreshRule = useCallback(async () => {
    const stored = await getPrayerRule();
    if (!stored.initialized) {
      const seeded: PrayerRule = {
        morning: STARTER_RULE.morning,
        evening: STARTER_RULE.evening,
        initialized: true,
      };
      await setPrayerRule(seeded);
      setRule(seeded);
    } else {
      setRule(stored);
    }
  }, []);

  useEffect(() => {
    refreshRule();
  }, [refreshRule]);

  const itemIds = rule ? rule[slot] : [];

  // Re-read the rule whenever the screen comes into focus (e.g. after a
  // round-trip to the builder). Lightweight — single AsyncStorage read.
  useEffect(() => {
    const interval = setInterval(refreshRule, 1500);
    return () => clearInterval(interval);
  }, [refreshRule]);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "",
          headerBackTitle: "Back",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.accent,
          headerShadowVisible: false,
          headerRight: () => (
            <Pressable
              onPress={() => router.push("/prayer-builder")}
              style={({ pressed }) => [
                styles.modeButton,
                pressed && { opacity: 0.6 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Edit your prayer rule"
            >
              <Text style={styles.modeButtonText}>Edit</Text>
            </Pressable>
          ),
        }}
      />
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <LinearGradient
          colors={[
            slot === "morning"
              ? "rgba(212, 168, 87, 0.12)"
              : "rgba(106, 67, 130, 0.10)",
            "transparent",
            colors.background,
          ]}
          locations={[0, 0.3, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Eyebrow tone="accent">Prayer Rule</Eyebrow>
            <Text style={styles.title}>
              {slot === "morning" ? "Morning Prayers" : "Evening Prayers"}
            </Text>
            <GiltRule style={{ marginTop: spacing.sm }} />
          </View>

          {/* Slot tabs */}
          <View style={styles.slotTabs}>
            {(["morning", "evening"] as Slot[]).map((s) => {
              const active = s === slot;
              return (
                <Pressable
                  key={s}
                  onPress={() => setSlot(s)}
                  style={({ pressed }) => [
                    styles.slotTab,
                    active && styles.slotTabActive,
                    pressed && !active && { opacity: 0.7 },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text
                    style={[
                      styles.slotTabLabel,
                      active && styles.slotTabLabelActive,
                    ]}
                  >
                    {s === "morning" ? "Morning" : "Evening"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {rule == null ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : itemIds.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[text.body, { textAlign: "center" }]}>
                Your {slot} rule is empty. Tap &quot;Add prayer&quot; below to
                start building it.
              </Text>
            </View>
          ) : (
            <View style={styles.itemList}>
              {itemIds.map((id, index) => {
                const dyn = DYNAMIC_BY_ID.get(id);
                if (dyn) {
                  return (
                    <DynamicItemCard
                      key={`${id}-${index}`}
                      item={dyn}
                      daily={dailyQuery.data}
                      loading={dailyQuery.isLoading}
                    />
                  );
                }
                const prayer = PRAYER_BY_ID.get(id);
                if (!prayer) {
                  // Reference to a prayer no longer in the corpus — silently
                  // skip so an orphaned id can't break the read view.
                  return null;
                }
                return (
                  <PrayerCard key={`${id}-${index}`} prayer={prayer} />
                );
              })}
            </View>
          )}

          {/* Customize — routes to the full builder (same as Settings). */}
          <Pressable
            onPress={() => router.push("/prayer-builder")}
            style={({ pressed }) => [
              styles.addButton,
              pressed && { opacity: 0.8 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Customize your prayer rule"
          >
            <Text style={styles.addButtonPlus}>+</Text>
            <Text style={styles.addButtonLabel}>Add or edit prayers</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function PrayerCard({ prayer }: { prayer: PrayerEntry }) {
  const paragraphs = prayer.body.split("\n\n");
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderText}>
          {prayer.subtitle ? (
            <Text style={styles.cardSubtitle}>{prayer.subtitle}</Text>
          ) : null}
          <Text style={styles.cardTitle}>{prayer.title}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        {paragraphs.map((paragraph, i) => (
          <Text key={i} style={styles.bodyText}>
            {paragraph}
          </Text>
        ))}
      </View>
      {prayer.attribution ? (
        <Text style={styles.attribution}>— {prayer.attribution}</Text>
      ) : null}
    </View>
  );
}

function DynamicItemCard({
  item,
  daily,
  loading,
}: {
  item: DynamicItem;
  daily: DailyResponse | undefined;
  loading: boolean;
}) {
  // Find the matching reading from the daily payload. The lectionary
  // labels readings via `label` ("Gospel" / "Epistle") and `category`.
  const reading = useMemo(() => {
    if (!daily) return null;
    if (item.kind === "gospel-of-day") {
      return daily.readings.find(
        (r) => r.label.toLowerCase().includes("gospel"),
      );
    }
    if (item.kind === "epistle-of-day") {
      return daily.readings.find(
        (r) => r.label.toLowerCase().includes("epistle"),
      );
    }
    if (item.kind === "psalm-of-day") {
      return daily.readings.find(
        (r) =>
          r.label.toLowerCase().includes("psalm") ||
          r.scripture.bookSlug === "psalms",
      );
    }
    return null;
  }, [daily, item.kind]);

  const openReading = () => {
    if (!reading || !daily) return;
    const { bookSlug, chapterNumber, verseStart, verseEnd } = reading.scripture;
    const range =
      verseEnd && verseEnd !== verseStart
        ? `${verseStart}-${verseEnd}`
        : `${verseStart}`;
    router.push(
      `/explore?translation=${daily.translationSlug}&book=${bookSlug}&chapter=${chapterNumber}&highlight=${range}`,
    );
  };

  return (
    <View style={[styles.card, styles.cardDynamic]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
          <Text style={styles.cardTitle}>{item.title}</Text>
        </View>
      </View>
      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : reading ? (
        <Pressable
          onPress={openReading}
          style={({ pressed }) => [
            styles.dynLink,
            pressed && { opacity: 0.7 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Open ${reading.scripture.label}`}
        >
          <Pill variant="accent">{reading.label}</Pill>
          <Text style={styles.dynScripture}>{reading.scripture.label}</Text>
          <Text style={styles.dynOpen}>Open in reader →</Text>
        </Pressable>
      ) : (
        <Text style={[text.body, { color: colors.inkSoft }]}>
          No appointed reading for this slot today.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing["4xl"],
    gap: spacing.lg,
  },

  modeButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  modeButtonText: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: "600",
  },

  header: { gap: spacing.xs },
  title: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 40,
    color: colors.ink,
    letterSpacing: -0.6,
    lineHeight: 44,
  },

  slotTabs: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: 4,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  slotTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: radii.pill,
  },
  slotTabActive: {
    backgroundColor: colors.accentSoft,
  },
  slotTabLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.inkMuted,
    letterSpacing: 0.4,
  },
  slotTabLabelActive: {
    color: colors.accent,
  },

  loading: { paddingVertical: spacing["3xl"], alignItems: "center" },
  emptyState: {
    paddingVertical: spacing["3xl"],
    paddingHorizontal: spacing.lg,
  },

  itemList: { gap: spacing.md },

  card: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  cardDynamic: {
    borderColor: "rgba(212, 168, 87, 0.3)",
    backgroundColor: "rgba(212, 168, 87, 0.06)",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  cardHeaderText: { flex: 1, gap: 4 },
  cardSubtitle: {
    fontSize: 10.4,
    color: colors.inkSoft,
    letterSpacing: 2.4,
    textTransform: "uppercase",
    fontWeight: "500",
  },
  cardTitle: {
    fontFamily: fonts.serif,
    fontSize: 22,
    color: colors.ink,
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  cardBody: { gap: spacing.md },
  bodyText: {
    fontFamily: fonts.serif,
    fontSize: 16,
    lineHeight: 26,
    color: colors.ink,
  },
  attribution: {
    fontSize: 11,
    color: colors.inkSoft,
    fontStyle: "italic",
    letterSpacing: 0.4,
  },

  dynLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flexWrap: "wrap",
  },
  dynScripture: {
    fontFamily: fonts.serif,
    fontSize: 18,
    color: colors.ink,
    letterSpacing: -0.2,
    flex: 1,
  },
  dynOpen: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.accent,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },

  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: "rgba(212, 168, 87, 0.5)",
    borderStyle: "dashed",
    backgroundColor: "rgba(212, 168, 87, 0.05)",
  },
  addButtonPlus: {
    fontSize: 22,
    color: colors.accent,
    fontWeight: "300",
  },
  addButtonLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.accent,
    letterSpacing: 0.6,
  },
});

import Feather from "@expo/vector-icons/Feather";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { MenaionDay } from "@theosis/core";

import { Eyebrow, GiltRule } from "@/components/theosis/primitives";
import { colors, fonts, radii, spacing, text } from "@/constants/theosis-theme";
import { getApi } from "@/lib/api";

// Saints-by-date browse surface. Month picker at the top; below, a grid of
// day cells. Days with Menaion entries are highlighted in gold. Tapping a
// day reveals the day's primary commemoration plus co-commemorations.
//
// The Menaion JSON is universal (not jurisdictional), so this is just a
// calendar-grid wrapper over the existing Menaion data file.

const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function daysInMonth(month: number, year: number): number {
  // Returns last day of `month` (1-12) for a non-leap year unless year is leap.
  return new Date(year, month, 0).getDate();
}

export default function SaintsCalendarScreen() {
  const api = getApi();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [selectedMonthDay, setSelectedMonthDay] = useState<string | null>(null);

  const monthQuery = useQuery({
    queryKey: ["menaion-month", month],
    queryFn: () => api.fetchMenaionMonth(month),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const daysWithEntries = useMemo(() => {
    const m = new Map<string, MenaionDay>();
    for (const day of monthQuery.data?.days ?? []) {
      m.set(day.monthDay, day);
    }
    return m;
  }, [monthQuery.data]);

  const selectedDay = selectedMonthDay
    ? daysWithEntries.get(selectedMonthDay) ?? null
    : null;

  const lastDay = daysInMonth(month, now.getFullYear());
  const dayCells = Array.from({ length: lastDay }, (_, i) => i + 1);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Saints by date",
          headerBackTitle: "Library",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.accent,
          headerShadowVisible: false,
          headerTitleStyle: {
            fontFamily: fonts.serifBoldItalic,
            fontSize: 18,
            color: colors.ink,
          },
        }}
      />
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <LinearGradient
          colors={[
            "rgba(212, 168, 87, 0.10)",
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
          {/* Month picker chips */}
          <View style={styles.monthRow}>
            <Pressable
              onPress={() => {
                const prev = month === 1 ? 12 : month - 1;
                setMonth(prev);
                setSelectedMonthDay(null);
              }}
              hitSlop={10}
              style={({ pressed }) => [
                styles.monthArrow,
                pressed && { opacity: 0.6 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Previous month"
            >
              <Feather name="chevron-left" size={18} color={colors.inkMuted} />
            </Pressable>
            <View style={styles.monthLabelWrap}>
              <Eyebrow tone="accent">Synaxarion</Eyebrow>
              <Text style={styles.monthLabel}>{MONTH_LABELS[month - 1]}</Text>
            </View>
            <Pressable
              onPress={() => {
                const next = month === 12 ? 1 : month + 1;
                setMonth(next);
                setSelectedMonthDay(null);
              }}
              hitSlop={10}
              style={({ pressed }) => [
                styles.monthArrow,
                pressed && { opacity: 0.6 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Next month"
            >
              <Feather name="chevron-right" size={18} color={colors.inkMuted} />
            </Pressable>
          </View>

          <GiltRule full style={{ marginVertical: spacing.lg }} />

          {monthQuery.isLoading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : null}

          {monthQuery.error ? (
            <View style={styles.errorWrap}>
              <Eyebrow tone="oxblood">Couldn&apos;t load month</Eyebrow>
              <Text
                style={[text.body, { color: colors.error, marginTop: spacing.sm }]}
              >
                {monthQuery.error instanceof Error
                  ? monthQuery.error.message
                  : String(monthQuery.error)}
              </Text>
            </View>
          ) : null}

          {/* Day grid */}
          {!monthQuery.isLoading ? (
            <View style={styles.grid}>
              {dayCells.map((d) => {
                const key = `${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                const entry = daysWithEntries.get(key);
                const has = Boolean(entry);
                const isSelected = key === selectedMonthDay;
                const isToday =
                  month === now.getMonth() + 1 && d === now.getDate();
                return (
                  <Pressable
                    key={key}
                    onPress={() => setSelectedMonthDay(has ? key : null)}
                    style={({ pressed }) => [
                      styles.cell,
                      isSelected && styles.cellSelected,
                      has && !isSelected && styles.cellWithEntry,
                      isToday && styles.cellToday,
                      pressed && has && { opacity: 0.7 },
                    ]}
                    disabled={!has}
                    accessibilityRole="button"
                    accessibilityLabel={
                      has
                        ? `${MONTH_LABELS[month - 1]} ${d} — ${entry?.title}`
                        : `${MONTH_LABELS[month - 1]} ${d} — no entry`
                    }
                  >
                    <Text
                      style={[
                        styles.cellNumber,
                        isSelected && styles.cellNumberSelected,
                        has && !isSelected && styles.cellNumberWithEntry,
                        !has && styles.cellNumberEmpty,
                      ]}
                    >
                      {d}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {/* Selected day detail */}
          {selectedDay ? (
            <View style={styles.dayDetail}>
              <GiltRule full style={{ marginBottom: spacing.lg }} />
              <Eyebrow tone="accent">
                {MONTH_LABELS[month - 1]} {parseInt(selectedDay.monthDay.split("-")[1], 10)}
              </Eyebrow>
              <Text style={styles.dayTitle}>{selectedDay.title}</Text>
              {selectedDay.summary ? (
                <Text style={styles.daySummary}>{selectedDay.summary}</Text>
              ) : null}

              {selectedDay.saintIds.length > 0 ? (
                <View style={styles.dayLinksWrap}>
                  {selectedDay.saintIds.map((id) => (
                    <Pressable
                      key={id}
                      onPress={() => router.push(`/people/${id}`)}
                      style={({ pressed }) => [
                        styles.dayLink,
                        pressed && { opacity: 0.7 },
                      ]}
                      accessibilityRole="button"
                    >
                      <Feather name="user" size={13} color={colors.accent} />
                      <Text style={styles.dayLinkLabel}>
                        Read about {id.replace(/-/g, " ")}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              {selectedDay.also.length > 0 ? (
                <View style={styles.alsoSection}>
                  <Eyebrow tone="soft">Also commemorated</Eyebrow>
                  <View style={styles.alsoList}>
                    {selectedDay.also.map((item, idx) => {
                      const linkable = Boolean(item.saintId);
                      return (
                        <Pressable
                          key={`${item.name}-${idx}`}
                          onPress={
                            linkable
                              ? () => router.push(`/people/${item.saintId}`)
                              : undefined
                          }
                          style={({ pressed }) => [
                            styles.alsoRow,
                            pressed && linkable && { opacity: 0.6 },
                          ]}
                        >
                          <View
                            style={[
                              styles.alsoBullet,
                              linkable && { backgroundColor: colors.accent },
                            ]}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.alsoName}>{item.name}</Text>
                            {item.summary ? (
                              <Text style={styles.alsoSummary}>
                                {item.summary}
                              </Text>
                            ) : null}
                          </View>
                          {linkable ? (
                            <Feather
                              name="chevron-right"
                              size={14}
                              color={colors.inkSoft}
                            />
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}
            </View>
          ) : (
            !monthQuery.isLoading &&
            daysWithEntries.size === 0 && (
              <View style={styles.emptyMonth}>
                <Eyebrow tone="soft">No entries yet</Eyebrow>
                <Text style={styles.emptyMonthText}>
                  The Menaion for {MONTH_LABELS[month - 1]} is being prepared.
                  Other months may already be populated.
                </Text>
              </View>
            )
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const CELL_SIZE = 44;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing["4xl"],
  },
  loading: { paddingVertical: spacing["3xl"], alignItems: "center" },
  errorWrap: { padding: spacing.xl, gap: spacing.xs },

  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  monthArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
    backgroundColor: "rgba(212, 168, 87, 0.04)",
  },
  monthLabelWrap: { flex: 1, alignItems: "center", gap: 2 },
  monthLabel: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 30,
    color: colors.ink,
    letterSpacing: -0.5,
    marginTop: 2,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    justifyContent: "flex-start",
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: radii.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  cellWithEntry: {
    borderColor: colors.lineGilt,
    backgroundColor: "rgba(212, 168, 87, 0.06)",
  },
  cellSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  cellToday: {
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  cellNumber: {
    fontFamily: fonts.serif,
    fontSize: 15,
    color: colors.ink,
  },
  cellNumberWithEntry: {
    color: colors.accent,
    fontFamily: fonts.serifBoldItalic,
  },
  cellNumberSelected: {
    color: colors.background,
    fontFamily: fonts.serifBoldItalic,
  },
  cellNumberEmpty: {
    color: colors.inkSoft,
  },

  dayDetail: { marginTop: spacing.xl, gap: spacing.sm },
  dayTitle: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 24,
    color: colors.ink,
    letterSpacing: -0.4,
    lineHeight: 30,
    marginTop: spacing.sm,
  },
  daySummary: {
    fontFamily: fonts.serif,
    fontSize: 15,
    lineHeight: 24,
    color: colors.inkMuted,
    marginTop: spacing.xs,
  },
  dayLinksWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  dayLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
    backgroundColor: "rgba(212, 168, 87, 0.04)",
  },
  dayLinkLabel: {
    fontFamily: fonts.serifItalic,
    fontSize: 13,
    color: colors.accent,
    textTransform: "capitalize",
  },

  alsoSection: { marginTop: spacing.lg, gap: spacing.xs },
  alsoList: { gap: spacing.sm, marginTop: spacing.sm },
  alsoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  alsoBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.inkSoft,
    marginTop: 8,
  },
  alsoName: {
    fontFamily: fonts.serif,
    fontSize: 15,
    color: colors.ink,
    lineHeight: 22,
    letterSpacing: -0.1,
  },
  alsoSummary: {
    fontFamily: fonts.serifItalic,
    fontSize: 12,
    color: colors.inkSoft,
    lineHeight: 18,
    marginTop: 2,
  },

  emptyMonth: {
    paddingVertical: spacing["3xl"],
    alignItems: "center",
    gap: spacing.sm,
  },
  emptyMonthText: {
    fontFamily: fonts.serifItalic,
    fontSize: 14,
    color: colors.inkSoft,
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 22,
  },
});

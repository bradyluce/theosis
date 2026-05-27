import Feather from "@expo/vector-icons/Feather";
import { useQuery } from "@tanstack/react-query";
import { Stack, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type {
  ReadingPlanDay,
  ReadingPlanProgress,
  ReadingPlanReading,
} from "@theosis/core";

import { Card, Eyebrow } from "@/components/theosis/primitives";
import {
  colors,
  fonts,
  radii,
  spacing,
  text,
} from "@/constants/theosis-theme";
import { getApi } from "@/lib/api";
import {
  getReadingPlanProgress,
  markReadingPlanDay,
  removeReadingPlan,
  startReadingPlan,
  unmarkReadingPlanDay,
} from "@/lib/preferences";

// Per-plan detail screen. Shows the plan summary, current progress, and a
// scrollable list of days. Tapping a day's reading navigates to the Bible
// reader. Each row has a check toggle that marks the day complete.

export default function ReadingPlanDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const api = getApi();
  const { data, isLoading, error } = useQuery({
    queryKey: ["reading-plan", slug],
    queryFn: () => api.fetchReadingPlan(slug),
    enabled: Boolean(slug),
    staleTime: 1000 * 60 * 10,
  });

  const [progress, setProgress] = useState<ReadingPlanProgress | null>(null);
  useFocusEffect(
    useCallback(() => {
      void getReadingPlanProgress().then((all) => {
        if (!data?.plan) {
          setProgress(null);
          return;
        }
        setProgress(all.find((p) => p.planId === data.plan.id) ?? null);
      });
    }, [data?.plan]),
  );

  const completedSet = useMemo(
    () => new Set(progress?.completedDays ?? []),
    [progress],
  );

  const onStart = useCallback(async () => {
    if (!data?.plan) return;
    const all = await startReadingPlan(data.plan.id);
    setProgress(all.find((p) => p.planId === data.plan.id) ?? null);
  }, [data?.plan]);

  const onToggleDay = useCallback(
    async (day: number) => {
      if (!data?.plan) return;
      const isDone = completedSet.has(day);
      const all = isDone
        ? await unmarkReadingPlanDay(data.plan.id, day)
        : await markReadingPlanDay(data.plan.id, day);
      setProgress(all.find((p) => p.planId === data.plan.id) ?? null);
    },
    [data?.plan, completedSet],
  );

  const onRemove = useCallback(() => {
    if (!data?.plan) return;
    Alert.alert(
      "Remove plan?",
      "You'll lose your progress on this plan.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            await removeReadingPlan(data.plan.id);
            setProgress(null);
          },
        },
      ],
    );
  }, [data?.plan]);

  if (isLoading || !data) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.headerBar}>
          <BackButton />
        </View>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.headerBar}>
          <BackButton />
        </View>
        <View style={{ padding: spacing.lg }}>
          <Card>
            <Eyebrow tone="oxblood">Couldn&apos;t load plan</Eyebrow>
            <Text
              style={[text.body, { color: colors.error, marginTop: spacing.sm }]}
            >
              {error instanceof Error ? error.message : String(error)}
            </Text>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  const plan = data.plan;
  const completedCount = completedSet.size;
  const percent = Math.min(100, Math.round((completedCount / plan.totalDays) * 100));

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.headerBar}>
        <BackButton />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <Eyebrow tone="accent">
            {plan.category === "scripture"
              ? "Scripture plan"
              : plan.category === "psalter"
                ? "Psalter plan"
                : "Seasonal plan"}
          </Eyebrow>
          <Text style={text.titleDisplay}>{plan.title}</Text>
          <Text style={[text.body, { marginTop: spacing.sm }]}>{plan.summary}</Text>
        </View>

        {progress ? (
          <View style={styles.progressBlock}>
            <View style={styles.rowBetween}>
              <Eyebrow tone="accent">
                Day {Math.min(progress.currentDay, plan.totalDays)} of {plan.totalDays}
              </Eyebrow>
              <Text style={styles.progressMeta}>
                {completedCount} / {plan.totalDays}
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${percent}%` }]} />
            </View>
            <Pressable
              onPress={onRemove}
              hitSlop={8}
              style={({ pressed }) => [
                styles.removeBtn,
                pressed && { opacity: 0.6 },
              ]}
              accessibilityRole="button"
            >
              <Feather name="trash-2" size={11} color={colors.inkSoft} />
              <Text style={styles.removeLabel}>Remove plan</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={onStart}
            style={({ pressed }) => [
              styles.startBtn,
              pressed && { opacity: 0.85 },
            ]}
            accessibilityRole="button"
          >
            <Text style={styles.startLabel}>Start plan</Text>
          </Pressable>
        )}

        <View style={styles.daysSection}>
          <Text style={text.titleMd}>Schedule</Text>
          {plan.days.map((day) => (
            <DayRow
              key={day.day}
              day={day}
              isCompleted={completedSet.has(day.day)}
              isCurrent={progress?.currentDay === day.day}
              canMark={Boolean(progress)}
              onToggle={() => onToggleDay(day.day)}
              onOpen={(reading) => {
                router.push(
                  `/reading/${reading.bookSlug}/${reading.chapterNumber}` as never,
                );
              }}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function BackButton() {
  return (
    <Pressable
      onPress={() => router.back()}
      hitSlop={10}
      style={styles.backBtn}
      accessibilityRole="button"
      accessibilityLabel="Back"
    >
      <Feather name="chevron-left" size={22} color={colors.ink} />
    </Pressable>
  );
}

function DayRow({
  day,
  isCompleted,
  isCurrent,
  canMark,
  onToggle,
  onOpen,
}: {
  day: ReadingPlanDay;
  isCompleted: boolean;
  isCurrent: boolean;
  canMark: boolean;
  onToggle: () => void;
  onOpen: (reading: ReadingPlanReading) => void;
}) {
  return (
    <View
      style={[
        styles.dayRow,
        isCurrent && styles.dayRowCurrent,
        isCompleted && styles.dayRowDone,
      ]}
    >
      <Pressable
        onPress={onToggle}
        disabled={!canMark}
        hitSlop={6}
        style={[
          styles.checkBtn,
          isCompleted && styles.checkBtnDone,
          !canMark && { opacity: 0.4 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={isCompleted ? "Mark as not read" : "Mark complete"}
        accessibilityState={{ checked: isCompleted }}
      >
        {isCompleted ? (
          <Feather name="check" size={14} color={colors.background} />
        ) : (
          <View style={styles.checkDot} />
        )}
      </Pressable>

      <Pressable
        onPress={() => day.readings[0] && onOpen(day.readings[0])}
        style={{ flex: 1 }}
      >
        <View style={styles.rowBetween}>
          <Text style={styles.dayLabel}>{day.label ?? `Day ${day.day}`}</Text>
          {isCurrent ? <Text style={styles.todayPill}>Today</Text> : null}
        </View>
        <Text style={[text.titleSm, { marginTop: 2 }]}>
          {day.readings.map((r) => r.label).join(" · ")}
        </Text>
        {day.note ? (
          <Text style={[text.body, { fontSize: 13, marginTop: 2 }]}>
            {day.note}
          </Text>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  headerBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -spacing.sm,
  },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing["5xl"],
    gap: spacing.xl,
  },
  heading: { gap: spacing.xs },
  progressBlock: {
    padding: spacing.lg,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressMeta: {
    ...text.eyebrow,
    fontSize: 9.5,
    textTransform: "uppercase",
  },
  progressTrack: {
    height: 3,
    borderRadius: 999,
    backgroundColor: colors.line,
    overflow: "hidden",
    marginTop: spacing.xs,
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.accent,
    opacity: 0.7,
    borderRadius: 999,
  },
  removeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.sm,
    alignSelf: "flex-start",
  },
  removeLabel: {
    ...text.eyebrow,
    fontSize: 9,
    textTransform: "uppercase",
  },
  startBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
    backgroundColor: colors.accentSoft,
  },
  startLabel: {
    ...text.eyebrowAccent,
    fontSize: 11,
  },
  daysSection: { gap: spacing.sm },
  dayRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  dayRowCurrent: {
    borderColor: colors.lineGilt,
  },
  dayRowDone: {
    opacity: 0.8,
  },
  checkBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    backgroundColor: colors.background,
  },
  checkBtnDone: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  checkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.lineStrong,
  },
  dayLabel: {
    ...text.eyebrow,
    fontSize: 9.5,
    textTransform: "uppercase",
  },
  todayPill: {
    ...text.eyebrowAccent,
    fontSize: 9,
  },
});

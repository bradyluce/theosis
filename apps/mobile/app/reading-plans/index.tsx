import Feather from "@expo/vector-icons/Feather";
import { useQuery } from "@tanstack/react-query";
import { Stack, router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card, Eyebrow, GiltRule } from "@/components/theosis/primitives";
import {
  colors,
  fonts,
  radii,
  spacing,
  text,
} from "@/constants/theosis-theme";
import type { ReadingPlanProgress } from "@theosis/core";
import { getApi } from "@/lib/api";
import { getReadingPlanProgress } from "@/lib/preferences";

// Reading plans index. Two sections: "In progress" (plans with persisted
// progress, with a small progress bar) and "Available" (everything else).
// Tapping a card pushes to /reading-plans/[slug].

export default function ReadingPlansIndexScreen() {
  const api = getApi();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["reading-plans"],
    queryFn: () => api.fetchReadingPlans(),
    staleTime: 1000 * 60 * 10,
  });

  const [progress, setProgress] = useState<ReadingPlanProgress[]>([]);
  useFocusEffect(
    useCallback(() => {
      // Refresh persisted progress on focus — the user may have marked a
      // day complete on the detail screen and come back here.
      void getReadingPlanProgress().then(setProgress);
    }, []),
  );

  const plans = data?.plans ?? [];
  const activeIds = new Set(progress.map((p) => p.planId));
  const active = plans
    .filter((plan) => activeIds.has(plan.id))
    .map((plan) => ({
      plan,
      prog: progress.find((p) => p.planId === plan.id)!,
    }));
  const available = plans.filter((plan) => !activeIds.has(plan.id));

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.headerBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Feather name="chevron-left" size={22} color={colors.ink} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Eyebrow tone="accent">Read with the Church</Eyebrow>
          <Text style={text.titleDisplay}>Reading plans</Text>
          <Text style={[text.body, styles.intro]}>
            Short, structured paths through the Scriptures. Start one and
            today&apos;s reading will surface on your home screen.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : null}

        {error ? (
          <Card>
            <Eyebrow tone="oxblood">Couldn&apos;t load plans</Eyebrow>
            <Text style={[text.body, { color: colors.error, marginTop: spacing.sm }]}>
              {error instanceof Error ? error.message : String(error)}
            </Text>
            <Pressable
              onPress={() => refetch()}
              style={({ pressed }) => [
                styles.retry,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.retryLabel}>Try again</Text>
            </Pressable>
          </Card>
        ) : null}

        {active.length > 0 ? (
          <View style={styles.section}>
            <Text style={text.titleMd}>In progress</Text>
            <GiltRule />
            {active.map(({ plan, prog }) => (
              <ActivePlanCard
                key={plan.id}
                slug={plan.slug}
                title={plan.title}
                subtitle={plan.subtitle}
                totalDays={plan.totalDays}
                completed={prog.completedDays.length}
                currentDay={prog.currentDay}
              />
            ))}
          </View>
        ) : null}

        {available.length > 0 ? (
          <View style={styles.section}>
            <Text style={text.titleMd}>
              {active.length > 0 ? "More plans" : "Available plans"}
            </Text>
            <GiltRule />
            {available.map((plan) => (
              <PlanCard
                key={plan.id}
                slug={plan.slug}
                title={plan.title}
                subtitle={plan.subtitle}
                totalDays={plan.totalDays}
                category={plan.category}
                estimatedMinutesPerDay={plan.estimatedMinutesPerDay}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function ActivePlanCard({
  slug,
  title,
  subtitle,
  totalDays,
  completed,
  currentDay,
}: {
  slug: string;
  title: string;
  subtitle: string;
  totalDays: number;
  completed: number;
  currentDay: number;
}) {
  const percent = Math.min(100, Math.round((completed / totalDays) * 100));
  return (
    <Pressable
      onPress={() => router.push(`/reading-plans/${slug}` as never)}
      style={({ pressed }) => [
        styles.card,
        styles.cardActive,
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={styles.rowBetween}>
        <Eyebrow tone="accent">
          Day {Math.min(currentDay, totalDays)} of {totalDays}
        </Eyebrow>
        <Text style={styles.progressLabel}>
          {completed} / {totalDays}
        </Text>
      </View>
      <Text style={[text.titleSm, { marginTop: spacing.xs }]}>{title}</Text>
      <Text style={[text.body, { marginTop: 2 }]}>{subtitle}</Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${percent}%` }]} />
      </View>
    </Pressable>
  );
}

function PlanCard({
  slug,
  title,
  subtitle,
  totalDays,
  category,
  estimatedMinutesPerDay,
}: {
  slug: string;
  title: string;
  subtitle: string;
  totalDays: number;
  category: "scripture" | "psalter" | "season";
  estimatedMinutesPerDay: number;
}) {
  const eyebrow =
    category === "scripture"
      ? "Scripture"
      : category === "psalter"
        ? "Psalter"
        : "Season";
  return (
    <Pressable
      onPress={() => router.push(`/reading-plans/${slug}` as never)}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.cardRow}>
        <View style={styles.cardBadge}>
          <Text style={styles.cardBadgeText}>{totalDays}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Eyebrow tone="accent">{eyebrow}</Eyebrow>
          <Text style={[text.titleSm, { marginTop: 2 }]}>{title}</Text>
          <Text style={[text.body, { marginTop: 2 }]}>{subtitle}</Text>
          <Text style={[text.body, styles.cardMeta]}>
            {totalDays} days · ~{estimatedMinutesPerDay} min/day
          </Text>
        </View>
        <Feather
          name="chevron-right"
          size={16}
          color={colors.inkSoft}
          style={{ marginTop: 6 }}
        />
      </View>
    </Pressable>
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
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing["5xl"],
    gap: spacing.xl,
  },
  header: {
    gap: spacing.xs,
  },
  intro: {
    marginTop: spacing.xs,
  },
  loading: {
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
  retry: {
    marginTop: spacing.md,
    alignSelf: "flex-start",
  },
  retryLabel: {
    ...text.eyebrowAccent,
    fontSize: 10,
  },
  section: {
    gap: spacing.md,
  },
  card: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  cardActive: {
    borderColor: colors.lineGilt,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  cardBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBadgeText: {
    fontFamily: fonts.serifBold,
    fontSize: 16,
    color: colors.accent,
  },
  cardMeta: {
    marginTop: spacing.sm,
    fontSize: 11,
    color: colors.inkSoft,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabel: {
    ...text.eyebrow,
    fontSize: 9.5,
    textTransform: "uppercase",
  },
  progressTrack: {
    height: 3,
    borderRadius: 999,
    backgroundColor: colors.line,
    overflow: "hidden",
    marginTop: spacing.md,
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.accent,
    opacity: 0.7,
    borderRadius: 999,
  },
});

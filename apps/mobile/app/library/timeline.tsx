import Feather from "@expo/vector-icons/Feather";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Stack, router } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  type TimelineEntry,
  centuryFromYear,
  centuryLabel,
} from "@theosis/core";

import { Card, Eyebrow, GiltRule } from "@/components/theosis/primitives";
import {
  colors,
  fonts,
  radii,
  spacing,
  text,
} from "@/constants/theosis-theme";
import { getApi } from "@/lib/api";

// Patristic timeline. Sticky century strip at the top; tapping a century
// scrolls the list to that section. Each section shows featured (iconed)
// people as cards and the rest as a compact list.

const CENTURY_FROM = 1;
const CENTURY_TO = 21;

export default function TimelineScreen() {
  const api = getApi();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["library-timeline"],
    queryFn: () => api.fetchLibraryTimeline(),
    staleTime: 60 * 60 * 1000,
  });

  const [saintsOnly, setSaintsOnly] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const [sectionYs, setSectionYs] = useState<Record<number, number>>({});

  const buckets = useMemo(() => {
    const map = new Map<number, TimelineEntry[]>();
    for (const entry of data?.entries ?? []) {
      const c = centuryFromYear(entry.year);
      let arr = map.get(c);
      if (!arr) {
        arr = [];
        map.set(c, arr);
      }
      arr.push(entry);
    }
    return map;
  }, [data]);

  const centuries = useMemo(
    () =>
      Array.from({ length: CENTURY_TO - CENTURY_FROM + 1 }, (_, i) => CENTURY_FROM + i)
        .filter((c) => (buckets.get(c)?.length ?? 0) > 0),
    [buckets],
  );

  const onCenturyLayout = (c: number) => (e: { nativeEvent: { layout: { y: number } } }) => {
    const y = e.nativeEvent.layout.y;
    setSectionYs((prev) => (prev[c] === y ? prev : { ...prev, [c]: y }));
  };

  const jumpTo = (c: number) => {
    const y = sectionYs[c];
    if (y == null) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
  };

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
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <Eyebrow tone="accent">Across the centuries</Eyebrow>
          <Text style={text.titleDisplay}>Patristic timeline</Text>
          <Text style={[text.body, { marginTop: spacing.sm }]}>
            Every Father and saint in the library, arranged by century.
            Tap a century to jump, tap a name to read more.
          </Text>
        </View>

        <View style={styles.filterRow}>
          <Pressable
            onPress={() => setSaintsOnly((v) => !v)}
            style={({ pressed }) => [
              styles.filterChip,
              saintsOnly && styles.filterChipActive,
              pressed && { opacity: 0.85 },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: saintsOnly }}
          >
            <Text
              style={[
                styles.filterChipLabel,
                saintsOnly && styles.filterChipLabelActive,
              ]}
            >
              {saintsOnly ? "Saints only" : "All voices"}
            </Text>
          </Pressable>
        </View>

        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : null}

        {error ? (
          <Card>
            <Eyebrow tone="oxblood">Couldn&apos;t load timeline</Eyebrow>
            <Text style={[text.body, { color: colors.error, marginTop: spacing.sm }]}>
              {error instanceof Error ? error.message : String(error)}
            </Text>
            <Pressable
              onPress={() => refetch()}
              style={({ pressed }) => [
                { marginTop: spacing.sm },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.retryLabel}>Try again</Text>
            </Pressable>
          </Card>
        ) : null}

        {/* Century strip — horizontal scroll, taps jump to section */}
        {centuries.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.centuryStrip}
            contentContainerStyle={styles.centuryStripContent}
          >
            {centuries.map((c) => {
              const count = buckets.get(c)?.length ?? 0;
              return (
                <Pressable
                  key={c}
                  onPress={() => jumpTo(c)}
                  style={({ pressed }) => [
                    styles.centuryChip,
                    pressed && { opacity: 0.8 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Jump to ${centuryLabel(c)} century`}
                >
                  <Text style={styles.centuryChipNum}>{centuryLabel(c)}</Text>
                  <Text style={styles.centuryChipCount}>
                    {count} {count === 1 ? "voice" : "voices"}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        <View style={styles.sectionList}>
          {centuries.map((c) => {
            const entries = (buckets.get(c) ?? []).filter((entry) =>
              saintsOnly ? entry.kind === "saint" : true,
            );
            if (entries.length === 0) return null;
            return (
              <CenturySection
                key={c}
                century={c}
                entries={entries}
                onLayout={onCenturyLayout(c)}
              />
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function CenturySection({
  century,
  entries,
  onLayout,
}: {
  century: number;
  entries: TimelineEntry[];
  onLayout: (e: { nativeEvent: { layout: { y: number } } }) => void;
}) {
  const featured = entries.filter((e) => e.icon).slice(0, 6);
  const featuredSet = new Set(featured.map((e) => e.personId));
  const remaining = entries.filter((e) => !featuredSet.has(e.personId));

  return (
    <View style={styles.section} onLayout={onLayout}>
      <View style={styles.sectionHeader}>
        <Text style={text.titleLg}>{centuryLabel(century)} century</Text>
        <Text style={styles.sectionMeta}>
          {entries.length} {entries.length === 1 ? "voice" : "voices"}
        </Text>
      </View>
      <GiltRule full style={{ opacity: 0.4 }} />

      {featured.length > 0 ? (
        <View style={styles.featuredGrid}>
          {featured.map((entry) => (
            <FeaturedCard key={entry.personId} entry={entry} />
          ))}
        </View>
      ) : null}

      {remaining.length > 0 ? (
        <View style={styles.compactList}>
          {remaining.map((entry) => (
            <Pressable
              key={entry.personId}
              onPress={() =>
                router.push(`/people/${entry.personSlug}` as never)
              }
              style={({ pressed }) => [
                styles.compactRow,
                pressed && { opacity: 0.7 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={entry.name}
            >
              <Text style={styles.compactName}>
                {entry.honorific
                  ? `${entry.honorific} ${entry.name}`
                  : entry.name}
              </Text>
              <Text style={styles.compactEra}>{entry.eraLabel}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function FeaturedCard({ entry }: { entry: TimelineEntry }) {
  return (
    <Pressable
      onPress={() => router.push(`/people/${entry.personSlug}` as never)}
      style={({ pressed }) => [
        styles.featuredCard,
        pressed && { opacity: 0.85 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={entry.name}
    >
      {entry.icon ? (
        <Image
          source={{ uri: entry.icon.src }}
          style={styles.featuredIcon}
          contentFit="cover"
          accessibilityLabel={entry.icon.alt}
        />
      ) : (
        <View style={styles.featuredIconFallback}>
          <Text style={styles.featuredIconFallbackText}>
            {(entry.honorific ?? entry.name)
              .replace(/^(St\.|the |of )/, "")
              .trim()
              .slice(0, 1)}
          </Text>
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.featuredName} numberOfLines={1}>
          {entry.honorific
            ? `${entry.honorific} ${entry.name}`
            : entry.name}
        </Text>
        <Text style={styles.featuredEra} numberOfLines={1}>
          {entry.eraLabel}
        </Text>
      </View>
      <Feather name="chevron-right" size={12} color={colors.inkSoft} />
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
  heading: { gap: spacing.xs },
  filterRow: {
    flexDirection: "row",
  },
  filterChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  filterChipActive: {
    borderColor: colors.lineGilt,
    backgroundColor: colors.accentSoft,
  },
  filterChipLabel: {
    ...text.eyebrow,
    fontSize: 10,
    textTransform: "uppercase",
  },
  filterChipLabelActive: {
    color: colors.accent,
  },
  loading: { paddingVertical: spacing.xl, alignItems: "center" },
  retryLabel: {
    ...text.eyebrowAccent,
    fontSize: 10,
  },
  centuryStrip: {
    marginHorizontal: -spacing.lg,
  },
  centuryStripContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  centuryChip: {
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    minWidth: 72,
  },
  centuryChipNum: {
    fontFamily: fonts.serifBold,
    fontSize: 15,
    color: colors.ink,
  },
  centuryChipCount: {
    fontFamily: fonts.sans,
    fontSize: 9,
    color: colors.inkSoft,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginTop: 1,
  },
  sectionList: { gap: spacing.xl },
  section: { gap: spacing.sm },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  sectionMeta: {
    ...text.eyebrow,
    fontSize: 9.5,
    textTransform: "uppercase",
  },
  featuredGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  featuredCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    flexGrow: 1,
    flexBasis: "47%",
    minWidth: 0,
  },
  featuredIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  featuredIconFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
    alignItems: "center",
    justifyContent: "center",
  },
  featuredIconFallbackText: {
    fontFamily: fonts.serifBold,
    fontSize: 16,
    color: colors.accent,
  },
  featuredName: {
    fontFamily: fonts.serifBold,
    fontSize: 13,
    color: colors.ink,
    letterSpacing: -0.1,
  },
  featuredEra: {
    fontFamily: fonts.sans,
    fontSize: 9.5,
    color: colors.inkSoft,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    marginTop: 1,
  },
  compactList: {
    gap: 1,
    marginTop: spacing.xs,
  },
  compactRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  compactName: {
    fontFamily: fonts.serif,
    fontSize: 14,
    color: colors.ink,
    flex: 1,
    minWidth: 0,
  },
  compactEra: {
    fontFamily: fonts.sans,
    fontSize: 9.5,
    color: colors.inkSoft,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
});

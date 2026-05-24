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
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { GuideSummary } from "@theosis/core";

import { Eyebrow, GiltRule } from "@/components/theosis/primitives";
import { colors, fonts, radii, spacing } from "@/constants/theosis-theme";
import { getApi } from "@/lib/api";

// Browse every Orthodox basics guide. Groups by category so guides for
// first steps (the most-requested) lead the list.

const CATEGORY_LABELS: Record<GuideSummary["category"], string> = {
  "first-steps": "First steps",
  worship: "Worship",
  sacrament: "Mystery",
  practice: "Practice",
  season: "Season",
  life: "Life",
};

const CATEGORY_GLYPHS: Record<
  GuideSummary["category"],
  React.ComponentProps<typeof Feather>["name"]
> = {
  "first-steps": "map",
  worship: "book-open",
  sacrament: "feather",
  practice: "compass",
  season: "sun",
  life: "heart",
};

const CATEGORY_ORDER: GuideSummary["category"][] = [
  "first-steps",
  "sacrament",
  "worship",
  "practice",
  "season",
  "life",
];

export default function GuidesBrowseScreen() {
  const api = getApi();
  const [query, setQuery] = useState("");

  const guidesQuery = useQuery({
    queryKey: ["guides-index"],
    queryFn: () => api.fetchGuides(),
    staleTime: 60 * 60 * 1000,
  });

  const filteredByCategory = useMemo(() => {
    const all = guidesQuery.data?.guides ?? [];
    const q = query.trim().toLowerCase();
    const filtered = q
      ? all.filter(
          (g) =>
            g.title.toLowerCase().includes(q) ||
            g.summary.toLowerCase().includes(q),
        )
      : all;

    const grouped = new Map<GuideSummary["category"], GuideSummary[]>();
    for (const guide of filtered) {
      const list = grouped.get(guide.category) ?? [];
      list.push(guide);
      grouped.set(guide.category, list);
    }
    return CATEGORY_ORDER.filter((c) => grouped.has(c)).map((category) => ({
      category,
      guides: grouped.get(category) ?? [],
    }));
  }, [guidesQuery.data, query]);

  const totalCount = useMemo(
    () => filteredByCategory.reduce((sum, group) => sum + group.guides.length, 0),
    [filteredByCategory],
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Orthodox basics",
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
          colors={["rgba(212, 168, 87, 0.08)", "transparent", colors.background]}
          locations={[0, 0.2, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <View style={styles.searchRow}>
          <Feather name="search" size={15} color={colors.inkSoft} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search guides"
            placeholderTextColor={colors.inkSoft}
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query ? (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Feather name="x" size={15} color={colors.inkSoft} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.countRow}>
          <Eyebrow tone="accent">
            {guidesQuery.isLoading
              ? "Loading"
              : `${totalCount} ${totalCount === 1 ? "guide" : "guides"}`}
          </Eyebrow>
        </View>
        <GiltRule style={{ marginHorizontal: spacing.xl }} />

        {guidesQuery.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {filteredByCategory.length === 0 && query ? (
              <View style={styles.emptyState}>
                <Eyebrow tone="soft">No matches</Eyebrow>
                <Text style={styles.emptyHint}>
                  No guides match &ldquo;{query}&rdquo;.
                </Text>
              </View>
            ) : null}

            {filteredByCategory.map((group) => (
              <View key={group.category} style={styles.categorySection}>
                <Eyebrow tone="accent">{CATEGORY_LABELS[group.category]}</Eyebrow>
                <GiltRule style={{ marginBottom: spacing.xs }} />
                {group.guides.map((guide) => (
                  <Pressable
                    key={guide.slug}
                    onPress={() => router.push(`/guides/${guide.slug}`)}
                    style={({ pressed }) => [
                      styles.guideRow,
                      pressed && styles.guideRowPressed,
                    ]}
                    accessibilityRole="button"
                  >
                    <View style={styles.guideIcon}>
                      <Feather
                        name={CATEGORY_GLYPHS[guide.category]}
                        size={16}
                        color={colors.accent}
                      />
                    </View>
                    <View style={styles.guideText}>
                      <Text style={styles.guideTitle} numberOfLines={2}>
                        {guide.title}
                      </Text>
                      <Text style={styles.guideSummary} numberOfLines={2}>
                        {guide.summary}
                      </Text>
                      <Text style={styles.guideMeta}>
                        ~{guide.readMinutes} min read
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={16} color={colors.inkSoft} />
                  </Pressable>
                ))}
              </View>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loading: { paddingVertical: spacing["4xl"], alignItems: "center" },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    color: colors.ink,
    fontSize: 14,
    fontFamily: fonts.sans,
  },

  countRow: { paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing["3xl"],
    gap: spacing.xl,
  },

  categorySection: { gap: spacing.xs },

  guideRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  guideRowPressed: {
    backgroundColor: "rgba(212, 168, 87, 0.05)",
    borderRadius: radii.card,
  },
  guideIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.card,
    backgroundColor: "rgba(212, 168, 87, 0.08)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  guideText: { flex: 1, gap: 4 },
  guideTitle: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.ink,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  guideSummary: {
    fontFamily: fonts.serifItalic,
    fontSize: 13,
    color: colors.inkMuted,
    lineHeight: 19,
  },
  guideMeta: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.inkSoft,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    fontWeight: "600",
  },

  emptyState: {
    paddingVertical: spacing["3xl"],
    alignItems: "center",
    gap: spacing.sm,
  },
  emptyHint: {
    fontFamily: fonts.serifItalic,
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: "center",
    maxWidth: 280,
  },
});

// Commentary Fathers picker — customize which Fathers' commentary
// appears under each verse, in what order, and which to hide.
//
// Data model in ProfilePrefs:
//   commentaryFathers: {
//     orderedSlugs?: string[]  // explicit display order, highest first
//     hiddenSlugs?: string[]   // Fathers the user never wants to see
//     quickFilter?: string     // remembered quick-filter for the picker UI
//   }
//
// The verse commentary modal consults both lists at render time. When
// `orderedSlugs` is empty the catalog's natural rank wins. When
// `hiddenSlugs` is non-empty those Fathers vanish from every verse.
//
// Quick filters mass-hide Fathers based on era / region. "Pre-Nicene"
// keeps Fathers whose era label includes "Apostolic", "2nd century",
// or "3rd century"; "Eastern" hides the Western Latin Fathers; etc.
// Filters are one-click *actions* — apply once, then the user can
// further tweak.

import Feather from "@expo/vector-icons/Feather";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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

import type { Person } from "@theosis/core";

import {
  Card,
  Eyebrow,
  GiltRule,
  SectionHeader,
  Wordmark,
} from "@/components/theosis/primitives";
import { colors, fonts, radii, spacing } from "@/constants/theosis-theme";
import { getApi } from "@/lib/api";
import { getProfilePrefs, updateProfilePrefs } from "@/lib/preferences";

// Latin / Western Fathers — used by the "Eastern" quick filter to mass-
// hide non-Eastern voices. The slugs match what ships in the commentary
// catalog. New Latin Fathers should be added here when they ingest.
const WESTERN_FATHER_SLUGS = new Set([
  "augustine",
  "ambrose",
  "tertullian",
  "cyprian",
  "hippolytus",
  "lactantius",
  "methodius", // Methodius of Olympus — Greek but often grouped Western
  "leo-the-great",
  "leo-i",
  "novatian",
  "victorinus-of-pettau",
  "commodianus",
  "arnobius",
  "venantius",
  "caius",
  "dionysius-of-rome",
  "malchion",
  "minucius-felix",
  "jerome",
]);

// Pre-Nicene era labels — matched as substrings against Person.eraLabel
// when applying the "Pre-Nicene" filter. The seed data isn't perfectly
// consistent (some say "2nd century", others "Apostolic Father") so we
// match any of these phrases.
const PRE_NICENE_LABEL_FRAGMENTS = [
  "apostolic",
  "1st century",
  "2nd century",
  "3rd century",
  "pre-nicene",
  "ante-nicene",
];

const POST_PATRISTIC_FRAGMENTS = [
  "modern",
  "19th century",
  "20th century",
  "21st century",
];

type QuickFilterId = "all" | "eastern" | "pre-nicene" | "post-patristic-only";

type QuickFilter = {
  id: QuickFilterId;
  label: string;
  description: string;
  apply: (people: Person[]) => string[]; // returns slugs TO HIDE
};

const QUICK_FILTERS: QuickFilter[] = [
  {
    id: "all",
    label: "Show all",
    description: "Every Father with commentary appears.",
    apply: () => [],
  },
  {
    id: "eastern",
    label: "Only Eastern",
    description: "Hide Western Latin Fathers (Augustine, Tertullian, etc.).",
    apply: (people) =>
      people.filter((p) => WESTERN_FATHER_SLUGS.has(p.slug)).map((p) => p.slug),
  },
  {
    id: "pre-nicene",
    label: "Only Pre-Nicene",
    description: "Hide everyone after Nicaea I (325).",
    apply: (people) =>
      people
        .filter((p) => {
          const era = p.eraLabel?.toLowerCase() ?? "";
          return !PRE_NICENE_LABEL_FRAGMENTS.some((f) => era.includes(f));
        })
        .map((p) => p.slug),
  },
  {
    id: "post-patristic-only",
    label: "Only Modern",
    description: "Hide patristic-era Fathers; keep modern commentary.",
    apply: (people) =>
      people
        .filter((p) => {
          const era = p.eraLabel?.toLowerCase() ?? "";
          return !POST_PATRISTIC_FRAGMENTS.some((f) => era.includes(f));
        })
        .map((p) => p.slug),
  },
];

export default function CommentaryFathersScreen() {
  const api = getApi();
  const catalogQuery = useQuery({
    queryKey: ["commentary-catalog"],
    queryFn: () => api.fetchCommentaryCatalog(),
    staleTime: 60 * 60 * 1000,
  });

  const [orderedSlugs, setOrderedSlugs] = useState<string[]>([]);
  const [hiddenSlugs, setHiddenSlugs] = useState<string[]>([]);
  const [quickFilterId, setQuickFilterId] = useState<QuickFilterId>("all");

  // Initial load — pull saved config and prime state.
  useEffect(() => {
    let canceled = false;
    void getProfilePrefs().then((p) => {
      if (canceled) return;
      setOrderedSlugs(p.commentaryFathers?.orderedSlugs ?? []);
      setHiddenSlugs(p.commentaryFathers?.hiddenSlugs ?? []);
      setQuickFilterId(
        (p.commentaryFathers?.quickFilter as QuickFilterId) ?? "all",
      );
    });
    return () => {
      canceled = true;
    };
  }, []);

  // Memoize allPeople against the query data so its identity is stable
  // between renders — without this, every downstream useMemo recomputes
  // on every render even when the catalog hasn't changed.
  const allPeople = useMemo<Person[]>(
    () => catalogQuery.data?.people ?? [],
    [catalogQuery.data?.people],
  );

  // The display list = orderedSlugs first (in user-set order), then any
  // catalog people not yet in the order, alphabetical for stability.
  // Hidden ones still render in this list — they just show in a muted
  // state with an eye-off glyph so the user can unhide.
  const displayList = useMemo<Person[]>(() => {
    const slugToPerson = new Map(allPeople.map((p) => [p.slug, p]));
    const ordered: Person[] = [];
    const seen = new Set<string>();
    for (const slug of orderedSlugs) {
      const p = slugToPerson.get(slug);
      if (p) {
        ordered.push(p);
        seen.add(slug);
      }
    }
    const remaining = allPeople
      .filter((p) => !seen.has(p.slug))
      .sort((a, b) => a.name.localeCompare(b.name));
    return [...ordered, ...remaining];
  }, [allPeople, orderedSlugs]);

  // Persist on every mutation — debounced via the call site (mutators
  // wrapped in `commit()`). No need for a separate save button.
  async function commit(next: {
    orderedSlugs?: string[];
    hiddenSlugs?: string[];
    quickFilter?: QuickFilterId;
  }) {
    await updateProfilePrefs({
      commentaryFathers: {
        orderedSlugs: next.orderedSlugs ?? orderedSlugs,
        hiddenSlugs: next.hiddenSlugs ?? hiddenSlugs,
        quickFilter: next.quickFilter ?? quickFilterId,
      },
    });
  }

  function toggleHidden(slug: string) {
    const isHidden = hiddenSlugs.includes(slug);
    const next = isHidden
      ? hiddenSlugs.filter((s) => s !== slug)
      : [...hiddenSlugs, slug];
    setHiddenSlugs(next);
    void commit({ hiddenSlugs: next });
  }

  function moveUp(slug: string) {
    // Promote into orderedSlugs if not yet explicitly ordered; move up
    // one position in the explicit order otherwise.
    const baseOrder = orderedSlugs.length
      ? orderedSlugs
      : displayList.map((p) => p.slug);
    const idx = baseOrder.indexOf(slug);
    if (idx <= 0) return;
    const next = [...baseOrder];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    setOrderedSlugs(next);
    void commit({ orderedSlugs: next });
  }

  function moveDown(slug: string) {
    const baseOrder = orderedSlugs.length
      ? orderedSlugs
      : displayList.map((p) => p.slug);
    const idx = baseOrder.indexOf(slug);
    if (idx < 0 || idx === baseOrder.length - 1) return;
    const next = [...baseOrder];
    [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
    setOrderedSlugs(next);
    void commit({ orderedSlugs: next });
  }

  function applyQuickFilter(filter: QuickFilter) {
    const toHide = filter.apply(allPeople);
    setHiddenSlugs(toHide);
    setQuickFilterId(filter.id);
    void commit({ hiddenSlugs: toHide, quickFilter: filter.id });
  }

  function resetAll() {
    Alert.alert(
      "Reset commentary fathers?",
      "Clears your custom order and unhides everyone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            setOrderedSlugs([]);
            setHiddenSlugs([]);
            setQuickFilterId("all");
            await updateProfilePrefs({
              commentaryFathers: {
                orderedSlugs: [],
                hiddenSlugs: [],
                quickFilter: "all",
              },
            });
          },
        },
      ],
    );
  }

  const visibleCount = displayList.filter(
    (p) => !hiddenSlugs.includes(p.slug),
  ).length;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={[
          "rgba(212, 168, 87, 0.12)",
          "rgba(139, 58, 58, 0.04)",
          colors.background,
        ]}
        locations={[0, 0.42, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.masthead}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={({ pressed }) => [
            styles.backButton,
            pressed && { opacity: 0.6 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Feather name="chevron-left" size={20} color={colors.inkMuted} />
        </Pressable>
        <Wordmark size={16} subline="Commentary" />
        <View style={styles.mastheadSpacer} />
      </View>
      <GiltRule full style={{ marginHorizontal: spacing.xl }} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Eyebrow tone="accent">Your patristic chorus</Eyebrow>
          <Text style={styles.title}>Fathers in commentary</Text>
          <Text style={styles.subtitle}>
            Choose whose voices appear under each verse, in what order, and
            which to silence. Quick filters mass-hide by era or region —
            then refine the list to taste.
          </Text>
          <GiltRule style={{ alignSelf: "flex-start", marginTop: spacing.md }} />
        </View>

        {/* Quick filters */}
        <Card>
          <SectionHeader
            eyebrow="One tap"
            title="Quick filters"
            rule
          />
          <View style={styles.filterRow}>
            {QUICK_FILTERS.map((filter) => {
              const active = quickFilterId === filter.id;
              return (
                <Pressable
                  key={filter.id}
                  onPress={() => applyQuickFilter(filter)}
                  style={({ pressed }) => [
                    styles.filterChip,
                    active && styles.filterChipActive,
                    pressed && { opacity: 0.85 },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${filter.label}. ${filter.description}`}
                >
                  <Text
                    style={[
                      styles.filterChipLabel,
                      active && styles.filterChipLabelActive,
                    ]}
                  >
                    {filter.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.filterDesc}>
            {QUICK_FILTERS.find((f) => f.id === quickFilterId)?.description}
          </Text>
        </Card>

        {/* Fathers list */}
        <Card>
          <SectionHeader
            eyebrow={`${visibleCount} of ${displayList.length} visible`}
            title="The chorus"
            rule
          />
          <Text style={styles.listHint}>
            Tap the eye to hide a Father from every verse. Use the arrows
            to reorder.
          </Text>

          {catalogQuery.isLoading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : null}

          {catalogQuery.error ? (
            <Text style={styles.error}>
              Couldn&apos;t load the commentary catalog.
            </Text>
          ) : null}

          <View style={styles.list}>
            {displayList.map((person, index) => {
              const isHidden = hiddenSlugs.includes(person.slug);
              const isFirst = index === 0;
              const isLast = index === displayList.length - 1;
              return (
                <View
                  key={person.slug}
                  style={[
                    styles.personRow,
                    isHidden && styles.personRowHidden,
                  ]}
                >
                  <View style={styles.personMain}>
                    <Text
                      style={[
                        styles.personName,
                        isHidden && styles.personNameHidden,
                      ]}
                      numberOfLines={1}
                    >
                      {person.honorific
                        ? `${person.honorific} ${person.name.split(",")[0]}`
                        : person.name.split(",")[0]}
                    </Text>
                    <Text style={styles.personEra} numberOfLines={1}>
                      {person.eraLabel || "Father"}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => moveUp(person.slug)}
                    disabled={isFirst}
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.iconButton,
                      isFirst && styles.iconButtonDisabled,
                      pressed && !isFirst && { opacity: 0.6 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Move ${person.name} up`}
                  >
                    <Feather
                      name="chevron-up"
                      size={16}
                      color={isFirst ? colors.inkSoft : colors.inkMuted}
                    />
                  </Pressable>
                  <Pressable
                    onPress={() => moveDown(person.slug)}
                    disabled={isLast}
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.iconButton,
                      isLast && styles.iconButtonDisabled,
                      pressed && !isLast && { opacity: 0.6 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Move ${person.name} down`}
                  >
                    <Feather
                      name="chevron-down"
                      size={16}
                      color={isLast ? colors.inkSoft : colors.inkMuted}
                    />
                  </Pressable>
                  <Pressable
                    onPress={() => toggleHidden(person.slug)}
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.iconButton,
                      isHidden && styles.iconButtonHidden,
                      pressed && { opacity: 0.6 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={
                      isHidden
                        ? `Show ${person.name} in commentary`
                        : `Hide ${person.name} from commentary`
                    }
                  >
                    <Feather
                      name={isHidden ? "eye-off" : "eye"}
                      size={16}
                      color={isHidden ? colors.oxbloodInk : colors.accent}
                    />
                  </Pressable>
                </View>
              );
            })}
          </View>
        </Card>

        {/* Reset */}
        <Pressable
          onPress={resetAll}
          style={({ pressed }) => [
            styles.resetButton,
            pressed && { opacity: 0.7 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Reset to defaults"
        >
          <Feather name="rotate-cw" size={13} color={colors.inkMuted} />
          <Text style={styles.resetLabel}>Reset to defaults</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  masthead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  mastheadSpacer: { width: 28 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing["4xl"],
    gap: spacing.xl,
  },
  hero: { gap: spacing.sm, paddingHorizontal: spacing.sm },
  title: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 36,
    color: colors.ink,
    letterSpacing: -0.6,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 14,
    color: colors.inkMuted,
    lineHeight: 21,
    marginTop: spacing.xs,
  },

  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.background,
  },
  filterChipActive: {
    borderColor: "rgba(212, 168, 87, 0.55)",
    backgroundColor: colors.accentSoft,
  },
  filterChipLabel: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: "700",
    color: colors.inkMuted,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  filterChipLabelActive: { color: colors.accent },
  filterDesc: {
    fontFamily: fonts.serifItalic,
    fontSize: 13,
    color: colors.inkSoft,
    marginTop: spacing.sm,
    lineHeight: 19,
  },

  listHint: {
    fontFamily: fonts.serifItalic,
    fontSize: 12,
    color: colors.inkSoft,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  loading: { paddingVertical: spacing.xl, alignItems: "center" },
  error: {
    fontFamily: fonts.serif,
    fontSize: 14,
    color: colors.error,
    paddingVertical: spacing.md,
  },
  list: { gap: spacing.xs, marginTop: spacing.md },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.background,
  },
  personRowHidden: {
    backgroundColor: colors.surface,
    opacity: 0.55,
  },
  personMain: { flex: 1, gap: 2, marginRight: spacing.xs },
  personName: {
    fontFamily: fonts.serif,
    fontSize: 15,
    color: colors.ink,
    letterSpacing: -0.1,
  },
  personNameHidden: {
    textDecorationLine: "line-through",
    color: colors.inkSoft,
  },
  personEra: {
    fontFamily: fonts.serifItalic,
    fontSize: 11,
    color: colors.inkSoft,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonDisabled: {
    opacity: 0.3,
  },
  iconButtonHidden: {
    backgroundColor: "rgba(139, 58, 58, 0.10)",
    borderColor: "rgba(139, 58, 58, 0.3)",
  },

  resetButton: {
    flexDirection: "row",
    alignSelf: "center",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  resetLabel: {
    fontFamily: fonts.serifItalic,
    fontSize: 13,
    color: colors.inkMuted,
  },
});

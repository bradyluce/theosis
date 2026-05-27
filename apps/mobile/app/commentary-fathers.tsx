// Commentary Fathers picker — customize whose voices appear under
// each verse, in what order, and which to silence.
//
// 349 Fathers is a lot to scroll. The picker now leads with:
//   - Common orderings — one-tap presets (Chrysostom & Cappadocians,
//     Apostolic & Pre-Nicene, Desert & Hesychast, Liturgical Greats,
//     Modern Russian, Scripture Commentators). Each sets orderedSlugs
//     to a curated head followed by everyone else, so the user lands
//     on the Fathers they recognize at the top.
//   - Pinned at the top — chips showing the first 8 ordered Fathers
//     with a quick × to remove from the explicit ordering.
//   - Quick filters — All / Eastern / Pre-Nicene / Modern (mass-hide
//     by era/region).
//   - Search input — filters the long list by name.
//
// Storage in ProfilePrefs.commentaryFathers stays the same:
//   { orderedSlugs?: string[], hiddenSlugs?: string[], quickFilter?: string }
// — the verse commentary modal reads both at render time.

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
  TextInput,
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

// Common orderings — one-tap presets that pin the most-cited Fathers
// to the top in a sensible group order. Slugs that don't exist in the
// catalog are silently ignored when applied. The display order of
// presets in the UI is the editorial order — Chrysostom & Cappadocians
// first because that's what most Orthodox lay readers want.
const PRESET_ORDERINGS = [
  {
    id: "chrysostom-cappadocian",
    label: "Chrysostom & Cappadocians",
    description:
      "Golden-mouthed homilies and the great Trinitarian Fathers.",
    slugs: [
      "john-chrysostom",
      "basil-the-great",
      "gregory-of-nazianzus",
      "gregory-of-nyssa",
      "gregory-the-theologian",
      "athanasius-the-great",
      "cyril-of-jerusalem",
      "cyril-of-alexandria",
    ],
  },
  {
    id: "apostolic-prenicene",
    label: "Apostolic & Pre-Nicene",
    description: "The earliest Fathers — disciples of the Apostles forward.",
    slugs: [
      "ignatius-of-antioch",
      "polycarp-of-smyrna",
      "clement-of-rome",
      "justin-martyr",
      "irenaeus-of-lyons",
      "clement-of-alexandria",
      "origen",
      "hippolytus-of-rome",
      "tertullian",
      "cyprian-of-carthage",
      "athanasius-the-great",
    ],
  },
  {
    id: "desert-hesychast",
    label: "Desert & Hesychast",
    description:
      "Ascetical wisdom — the Desert Fathers and the Philokalic line.",
    slugs: [
      "anthony-the-great",
      "antony-the-great",
      "macarius-the-egyptian",
      "pseudo-macarius",
      "mark-the-ascetic",
      "diadochos-of-photiki",
      "isaac-of-nineveh",
      "john-cassian",
      "maximus-the-confessor",
      "john-of-damascus",
      "symeon-the-new-theologian",
      "gregory-of-sinai",
      "gregory-palamas",
    ],
  },
  {
    id: "liturgical-greats",
    label: "Liturgical Greats",
    description:
      "Voices behind the Divine Liturgy and the great hymnographers.",
    slugs: [
      "john-chrysostom",
      "basil-the-great",
      "john-of-damascus",
      "andrew-of-crete",
      "romanos-the-melodist",
      "ephraim-the-syrian",
      "nicholas-cabasilas",
    ],
  },
  {
    id: "modern-russian",
    label: "Modern Russian",
    description:
      "19th–20th century Russian and Greek voices — Theophan, Sophrony, Schmemann.",
    slugs: [
      "theophan-the-recluse",
      "ignatius-brianchaninov",
      "anthony-bloom",
      "alexander-schmemann",
      "justin-popovich",
      "porphyrios-of-kafsokalivia",
      "paisios-the-athonite",
      "kallistos-ware",
      "vladimir-lossky",
      "silouan-the-athonite",
      "sophrony-sakharov",
    ],
  },
  {
    id: "scripture-commentators",
    label: "Scripture Commentators",
    description:
      "Verse-by-verse exegetes who built the Patristic Bible tradition.",
    slugs: [
      "john-chrysostom",
      "theophylact-of-ohrid",
      "cyril-of-alexandria",
      "augustine",
      "jerome",
      "andreas-of-caesarea",
      "ambrose-of-milan",
      "origen",
      "ephraim-the-syrian",
      "bede",
    ],
  },
];

// Latin / Western Fathers — used by the "Eastern" quick filter to
// mass-hide non-Eastern voices.
const WESTERN_FATHER_SLUGS = new Set([
  "augustine",
  "ambrose-of-milan",
  "ambrose",
  "tertullian",
  "cyprian",
  "cyprian-of-carthage",
  "hippolytus-of-rome",
  "hippolytus",
  "lactantius",
  "leo-the-great",
  "leo-i",
  "novatian",
  "victorinus-of-pettau",
  "commodianus",
  "arnobius",
  "venantius",
  "caius",
  "caius-of-rome",
  "dionysius-of-rome",
  "malchion",
  "minucius-felix",
  "jerome",
  "gregory-the-great",
  "bede",
  "alcuin",
  "anselm-canterbury",
]);

// Pre-Nicene era labels — matched as substrings against Person.eraLabel
// when applying the "Pre-Nicene" filter. Seed labels aren't perfectly
// consistent so we match any of these phrases.
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
    description: "Hide Western Latin Fathers.",
    apply: (people) =>
      people
        .filter((p) => WESTERN_FATHER_SLUGS.has(p.slug))
        .map((p) => p.slug),
  },
  {
    id: "pre-nicene",
    label: "Only Pre-Nicene",
    description: "Hide Fathers after Nicaea I (325).",
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
    description: "Hide patristic-era Fathers.",
    apply: (people) =>
      people
        .filter((p) => {
          const era = p.eraLabel?.toLowerCase() ?? "";
          return !POST_PATRISTIC_FRAGMENTS.some((f) => era.includes(f));
        })
        .map((p) => p.slug),
  },
];

const PINNED_PREVIEW_COUNT = 8;

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
  const [searchQuery, setSearchQuery] = useState("");

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

  // The commentary catalog occasionally has two Person rows with the
  // same slug (e.g. "evagrius-ponticus" appears twice — once as a
  // primary entry, once as a Catena cross-reference). React rejects
  // duplicate `key` props on siblings, so we dedupe by slug here.
  // First occurrence wins, which preserves the catalog's natural rank.
  const allPeople = useMemo<Person[]>(() => {
    const raw = catalogQuery.data?.people ?? [];
    const seen = new Set<string>();
    const unique: Person[] = [];
    for (const p of raw) {
      if (seen.has(p.slug)) continue;
      seen.add(p.slug);
      unique.push(p);
    }
    return unique;
  }, [catalogQuery.data?.people]);

  // Display list — orderedSlugs first (in user-set order), then
  // alphabetical remainder. Hidden ones still render here so the user
  // can find and unhide them.
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

  // Pinned preview — first N from the user's explicit ordering. When
  // ordering is empty (default), this section hides; the presets above
  // are the discovery path.
  const pinned = useMemo<Person[]>(() => {
    const slugToPerson = new Map(allPeople.map((p) => [p.slug, p]));
    return orderedSlugs
      .slice(0, PINNED_PREVIEW_COUNT)
      .map((slug) => slugToPerson.get(slug))
      .filter((p): p is Person => Boolean(p));
  }, [allPeople, orderedSlugs]);

  // Filtered + searched view of the long list. Search matches name +
  // honorific; era label too so "cappadocian" finds the right group.
  const filteredList = useMemo<Person[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return displayList;
    return displayList.filter((p) => {
      const name = (p.honorific ? `${p.honorific} ${p.name}` : p.name)
        .toLowerCase();
      const era = p.eraLabel?.toLowerCase() ?? "";
      return name.includes(q) || era.includes(q) || p.slug.includes(q);
    });
  }, [displayList, searchQuery]);

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

  function applyPreset(preset: typeof PRESET_ORDERINGS[number]) {
    const availableSlugs = new Set(allPeople.map((p) => p.slug));
    // Keep only the preset slugs that exist in the catalog (silently
    // ignore unknowns). The display-list useMemo above handles "the
    // rest" — preserving alphabetical order for non-pinned fathers.
    const validHead = preset.slugs.filter((s) => availableSlugs.has(s));
    setOrderedSlugs(validHead);
    void commit({ orderedSlugs: validHead });
  }

  function unpin(slug: string) {
    const next = orderedSlugs.filter((s) => s !== slug);
    setOrderedSlugs(next);
    void commit({ orderedSlugs: next });
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
            setSearchQuery("");
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
  const totalCount = displayList.length;

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
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Eyebrow tone="accent">Your patristic chorus</Eyebrow>
          <Text style={styles.title}>Fathers in commentary</Text>
          <Text style={styles.subtitle}>
            Choose whose voices appear under each verse, in what order, and
            which to silence. Start with a common ordering, then tune to
            taste.
          </Text>
          <GiltRule style={{ alignSelf: "flex-start", marginTop: spacing.md }} />
        </View>

        {/* Common orderings — presets */}
        <Card>
          <SectionHeader
            eyebrow="One tap"
            title="Common orderings"
            rule
          />
          <Text style={styles.cardHint}>
            Apply a curated head order. You can refine afterward.
          </Text>
          <View style={styles.presetGrid}>
            {PRESET_ORDERINGS.map((preset) => (
              <Pressable
                key={preset.id}
                onPress={() => applyPreset(preset)}
                style={({ pressed }) => [
                  styles.presetCard,
                  pressed && { opacity: 0.85 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${preset.label}. ${preset.description}`}
              >
                <Text style={styles.presetLabel}>{preset.label}</Text>
                <Text style={styles.presetDescription}>
                  {preset.description}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>

        {/* Pinned chips — only when explicit ordering is set */}
        {pinned.length > 0 ? (
          <Card>
            <SectionHeader
              eyebrow="Pinned"
              title="At the top of your list"
              rule
            />
            <Text style={styles.cardHint}>
              These appear first under every verse. Tap × to demote.
            </Text>
            <View style={styles.pinnedRow}>
              {pinned.map((person, idx) => (
                <View key={person.slug} style={styles.pinnedChip}>
                  <Text style={styles.pinnedPosition}>
                    {String(idx + 1).padStart(2, "0")}
                  </Text>
                  <Text
                    style={styles.pinnedName}
                    numberOfLines={1}
                  >
                    {person.honorific
                      ? `${person.honorific} ${person.name.split(",")[0]}`
                      : person.name.split(",")[0]}
                  </Text>
                  <Pressable
                    onPress={() => unpin(person.slug)}
                    hitSlop={6}
                    style={({ pressed }) => [
                      styles.pinnedRemove,
                      pressed && { opacity: 0.6 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${person.name} from pinned`}
                  >
                    <Feather name="x" size={11} color={colors.inkSoft} />
                  </Pressable>
                </View>
              ))}
            </View>
          </Card>
        ) : null}

        {/* Quick filters */}
        <Card>
          <SectionHeader
            eyebrow="Mass hide"
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

        {/* Fathers list with search */}
        <Card>
          <SectionHeader
            eyebrow={`${visibleCount} of ${totalCount} visible`}
            title="The chorus"
            rule
          />
          <Text style={styles.cardHint}>
            349 fathers. Search to find a specific voice, or scroll. Tap
            the eye to hide; arrows to reorder.
          </Text>

          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by name, era, or slug"
            placeholderTextColor={colors.inkSoft}
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />

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

          {filteredList.length === 0 && !catalogQuery.isLoading ? (
            <Text style={styles.emptySearch}>
              No fathers match &quot;{searchQuery}&quot;.
            </Text>
          ) : null}

          <View style={styles.list}>
            {filteredList.map((person, indexInFiltered) => {
              const isHidden = hiddenSlugs.includes(person.slug);
              // We compute up/down enabled-ness against the original
              // display order, not the filtered view, so reordering
              // still walks the full list rather than the search subset.
              const fullIndex = displayList.findIndex(
                (p) => p.slug === person.slug,
              );
              const isFirst = fullIndex === 0;
              const isLast = fullIndex === displayList.length - 1;
              // Unused but reserved for future tap-to-expand details.
              void indexInFiltered;
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
                    hitSlop={6}
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
                    hitSlop={6}
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
                    hitSlop={6}
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
  cardHint: {
    fontFamily: fonts.serifItalic,
    fontSize: 13,
    color: colors.inkSoft,
    marginTop: spacing.sm,
    lineHeight: 19,
  },

  // Preset cards
  presetGrid: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  presetCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(212, 168, 87, 0.4)",
    backgroundColor: "rgba(212, 168, 87, 0.06)",
    gap: 4,
  },
  presetLabel: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.ink,
    letterSpacing: -0.2,
    fontWeight: "600",
  },
  presetDescription: {
    fontFamily: fonts.serifItalic,
    fontSize: 12.5,
    color: colors.inkMuted,
    lineHeight: 18,
  },

  // Pinned chips
  pinnedRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  pinnedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 8,
    paddingRight: 4,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(212, 168, 87, 0.55)",
    backgroundColor: colors.accentSoft,
  },
  pinnedPosition: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 12,
    color: colors.accent,
    letterSpacing: -0.5,
  },
  pinnedName: {
    fontFamily: fonts.serif,
    fontSize: 13,
    color: colors.ink,
    maxWidth: 140,
    letterSpacing: -0.1,
  },
  pinnedRemove: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    marginLeft: 2,
  },

  // Quick filter chips
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

  searchInput: {
    marginTop: spacing.md,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontFamily: fonts.serif,
    fontSize: 15,
    color: colors.ink,
  },
  loading: { paddingVertical: spacing.xl, alignItems: "center" },
  error: {
    fontFamily: fonts.serif,
    fontSize: 14,
    color: colors.error,
    paddingVertical: spacing.md,
  },
  emptySearch: {
    fontFamily: fonts.serifItalic,
    fontSize: 14,
    color: colors.inkSoft,
    textAlign: "center",
    paddingVertical: spacing.lg,
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

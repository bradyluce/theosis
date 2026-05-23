import Feather from "@expo/vector-icons/Feather";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  Card,
  Eyebrow,
  GiltRule,
  Halo,
  SectionHeader,
  Wordmark,
} from "@/components/theosis/primitives";
import {
  colors,
  elevation,
  fonts,
  radii,
  spacing,
  text,
} from "@/constants/theosis-theme";
import { getApi } from "@/lib/api";

// Library — Featured spreads at the top (Father / Work), then quiet
// collapsible People + Works sections beneath. Saved / Completed tabs
// stay as placeholders until reading state ships.

type LibraryView = "library" | "saved" | "completed";

const FEATURED_FATHER_IDS = [
  "john-chrysostom",
  "augustine-of-hippo",
  "basil-the-great",
  "gregory-of-nazianzus",
  "gregory-of-nyssa",
  "athanasius-of-alexandria",
  "cyril-of-alexandria",
  "maximus-the-confessor",
  "john-of-damascus",
  "irenaeus-of-lyons",
  "gregory-palamas",
  "ignatius-of-antioch",
];

function pickFeaturedFatherId(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return FEATURED_FATHER_IDS[dayOfYear % FEATURED_FATHER_IDS.length];
}

export default function LibraryScreen() {
  const api = getApi();
  const [view, setView] = useState<LibraryView>("library");
  const [query, setQuery] = useState("");
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [worksOpen, setWorksOpen] = useState(false);

  const peopleQuery = useQuery({
    queryKey: ["library-people"],
    queryFn: () => api.fetchLibraryPeople(),
    staleTime: 60 * 60 * 1000,
  });

  const libraryCatalogQuery = useQuery({
    queryKey: ["library-catalog"],
    queryFn: () => api.fetchLibraryCatalog(),
    staleTime: 60 * 60 * 1000,
  });

  const featuredFatherId = useMemo(() => pickFeaturedFatherId(), []);
  const featuredFather = useMemo(() => {
    const people = peopleQuery.data?.people ?? [];
    return (
      people.find((p) => p.id === featuredFatherId) ??
      people.find((p) => p.kind === "father")
    );
  }, [peopleQuery.data, featuredFatherId]);

  // Restrict Library Works surfaces to works that actually have
  // long-form chapters (i.e., appear in the catalog's index.byWork).
  // Commentary-only "works" — HCF source titles that have no chapter
  // body — still resolve from commentary entries via worksById lookups
  // elsewhere; they just don't clutter the browsing surfaces here.
  const worksWithChapters = useMemo(() => {
    const byWork = libraryCatalogQuery.data?.index?.byWork;
    if (!byWork) return [];
    return (libraryCatalogQuery.data?.works ?? []).filter(
      (w) => byWork[w.id] != null,
    );
  }, [libraryCatalogQuery.data]);

  const featuredWork = useMemo(() => {
    if (worksWithChapters.length === 0) return null;
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor(
      (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
    const seed = dayOfYear + now.getFullYear() * 17;
    return worksWithChapters[seed % worksWithChapters.length];
  }, [worksWithChapters]);

  const featuredWorkAuthor = useMemo(() => {
    if (!featuredWork) return undefined;
    const people = peopleQuery.data?.people ?? [];
    return people.find((p) => p.id === featuredWork.personId);
  }, [featuredWork, peopleQuery.data]);

  const filteredPeople = useMemo(() => {
    const all = peopleQuery.data?.people ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.honorific?.toLowerCase().includes(q) ?? false) ||
        p.eraLabel.toLowerCase().includes(q) ||
        p.kind.includes(q),
    );
  }, [peopleQuery.data, query]);

  const filteredWorks = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return worksWithChapters;
    return worksWithChapters.filter(
      (w) =>
        w.title.toLowerCase().includes(q) ||
        w.shortTitle.toLowerCase().includes(q) ||
        w.eraLabel.toLowerCase().includes(q) ||
        w.workType.toLowerCase().includes(q),
    );
  }, [worksWithChapters, query]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
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

      <View style={styles.masthead}>
        <Wordmark size={18} subline="Library" />
        <View style={styles.viewTabs}>
          {(["library", "saved", "completed"] as LibraryView[]).map((v) => {
            const active = v === view;
            return (
              <Pressable
                key={v}
                onPress={() => setView(v)}
                hitSlop={4}
                style={({ pressed }) => [
                  styles.viewTab,
                  active && styles.viewTabActive,
                  pressed && !active && { opacity: 0.7 },
                ]}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.viewTabLabel,
                    active && styles.viewTabLabelActive,
                  ]}
                >
                  {v}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <GiltRule full style={{ marginHorizontal: spacing.xl }} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={peopleQuery.isFetching && !peopleQuery.isLoading}
            onRefresh={() => peopleQuery.refetch()}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        {view !== "library" ? (
          <View style={styles.placeholder}>
            <Feather
              name={view === "saved" ? "bookmark" : "check-circle"}
              size={28}
              color={colors.inkSoft}
            />
            <Text style={styles.placeholderTitle}>
              {view === "saved" ? "Saved" : "Completed"}
            </Text>
            <Text style={styles.placeholderBody}>
              {view === "saved"
                ? "Bookmark a work to keep it here."
                : "Finished works appear here as you read them."}
            </Text>
          </View>
        ) : (
          <>
            {/* Search input — sits below the masthead like a search blade */}
            <View style={styles.searchRow}>
              <Feather name="search" size={15} color={colors.inkSoft} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search Fathers, saints, works"
                placeholderTextColor={colors.inkSoft}
                style={styles.searchInput}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
              />
            </View>

            {peopleQuery.isLoading ? (
              <View style={styles.loading}>
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : null}

            {peopleQuery.error ? (
              <Card>
                <Eyebrow tone="oxblood">Couldn&apos;t load library</Eyebrow>
                <Text style={[text.body, { color: colors.error, marginTop: spacing.sm }]}>
                  {peopleQuery.error instanceof Error
                    ? peopleQuery.error.message
                    : String(peopleQuery.error)}
                </Text>
              </Card>
            ) : null}

            {/* Featured Father — editorial spread, dramatic */}
            {featuredFather ? (
              <Pressable
                onPress={() => router.push(`/people/${featuredFather.slug}`)}
                style={({ pressed }) => [
                  styles.featuredFather,
                  pressed && { opacity: 0.92 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Featured Father: ${featuredFather.name}`}
              >
                <View style={[styles.fatherPortraitWrap, elevation.giltGlow]}>
                  {featuredFather.icon ? (
                    <Image
                      source={{ uri: featuredFather.icon.src }}
                      style={styles.fatherPortrait}
                      contentFit="cover"
                      transition={240}
                      accessibilityLabel={featuredFather.icon.alt}
                    />
                  ) : (
                    <View
                      style={[styles.fatherPortrait, styles.fatherPortraitPlaceholder]}
                    >
                      <Text style={styles.fatherPortraitLetter}>
                        {featuredFather.name.charAt(0)}
                      </Text>
                    </View>
                  )}
                  <LinearGradient
                    colors={["transparent", "rgba(10, 9, 8, 0.85)"]}
                    locations={[0.45, 1]}
                    style={StyleSheet.absoluteFill}
                    pointerEvents="none"
                  />
                  <View style={styles.fatherPortraitOverlay}>
                    <Eyebrow tone="oxblood">
                      Featured · {featuredFather.kind}
                    </Eyebrow>
                    <Text style={styles.fatherName}>
                      {featuredFather.honorific
                        ? `${featuredFather.honorific} ${featuredFather.name.split(",")[0]}`
                        : featuredFather.name.split(",")[0]}
                    </Text>
                    <Text style={styles.fatherEra}>{featuredFather.eraLabel}</Text>
                  </View>
                </View>
                {featuredFather.summary ? (
                  <Text style={styles.fatherSummary} numberOfLines={3}>
                    {featuredFather.summary}
                  </Text>
                ) : null}
                <View style={styles.cta}>
                  <Text style={styles.ctaLabel}>Read the life</Text>
                  <Feather name="arrow-right" size={13} color={colors.accent} />
                </View>
              </Pressable>
            ) : null}

            {/* Featured Work — leather book metaphor */}
            {featuredWork ? (
              <Pressable
                onPress={() => router.push(`/works/${featuredWork.slug}`)}
                style={({ pressed }) => [pressed && { opacity: 0.92 }]}
                accessibilityRole="button"
                accessibilityLabel={`Featured work: ${featuredWork.title}`}
              >
                <Card intent="raised">
                  <View style={styles.workTopRow}>
                    <Eyebrow tone="accent">
                      Featured Work · {featuredWork.workType}
                    </Eyebrow>
                    <Feather name="book" size={16} color={colors.accent} />
                  </View>
                  <Text style={styles.workTitle}>{featuredWork.title}</Text>
                  {featuredWorkAuthor ? (
                    <Text style={styles.workByline}>
                      by{" "}
                      {featuredWorkAuthor.honorific
                        ? `${featuredWorkAuthor.honorific} ${featuredWorkAuthor.name.split(",")[0]}`
                        : featuredWorkAuthor.name.split(",")[0]}
                      {" — "}
                      {featuredWork.eraLabel}
                    </Text>
                  ) : (
                    <Text style={styles.workByline}>
                      {featuredWork.eraLabel} · {featuredWork.lengthLabel}
                    </Text>
                  )}
                  {featuredWork.summary ? (
                    <Text style={styles.workSummary} numberOfLines={3}>
                      {featuredWork.summary}
                    </Text>
                  ) : null}
                  <GiltRule style={{ marginTop: spacing.md }} />
                  <View style={[styles.cta, { marginTop: spacing.md }]}>
                    <Text style={styles.ctaLabel}>Open the work</Text>
                    <Feather
                      name="arrow-right"
                      size={13}
                      color={colors.accent}
                    />
                  </View>
                </Card>
              </Pressable>
            ) : null}

            {/* Collapsible sections */}
            <CollapsibleSection
              label="People"
              count={filteredPeople.length}
              open={peopleOpen}
              onToggle={() => setPeopleOpen((v) => !v)}
            >
              {filteredPeople.length === 0 ? (
                <Text style={styles.emptyInner}>
                  {query ? `No matches for "${query}".` : "No people yet."}
                </Text>
              ) : (
                filteredPeople.map((person) => (
                  <Pressable
                    key={person.id}
                    onPress={() => router.push(`/people/${person.slug}`)}
                    style={({ pressed }) => [
                      styles.personRow,
                      pressed && styles.personRowPressed,
                    ]}
                    accessibilityRole="button"
                  >
                    {person.icon ? (
                      <Halo size={48} glow={false} ringTone="muted">
                        <Image
                          source={{ uri: person.icon.src }}
                          style={styles.personIconImage}
                          contentFit="cover"
                          transition={150}
                          accessibilityLabel={person.icon.alt}
                        />
                      </Halo>
                    ) : (
                      <Halo size={48} glow={false} ringTone="muted">
                        <Text style={styles.personIconLetter}>
                          {(person.name.match(/[A-Z]/) ?? [person.name[0]])[0]}
                        </Text>
                      </Halo>
                    )}
                    <View style={styles.personMeta}>
                      <Text style={styles.personName}>
                        {person.honorific ? `${person.honorific} ` : ""}
                        {person.name}
                      </Text>
                      <Text style={styles.personEra}>
                        {person.kind} · {person.eraLabel}
                      </Text>
                    </View>
                    <Feather
                      name="chevron-right"
                      size={16}
                      color={colors.inkSoft}
                    />
                  </Pressable>
                ))
              )}
            </CollapsibleSection>

            <CollapsibleSection
              label="Works"
              count={
                libraryCatalogQuery.data ? filteredWorks.length : undefined
              }
              open={worksOpen}
              onToggle={() => setWorksOpen((v) => !v)}
            >
              {libraryCatalogQuery.isLoading ? (
                <View style={styles.loading}>
                  <ActivityIndicator color={colors.accent} />
                </View>
              ) : filteredWorks.length === 0 ? (
                <Text style={styles.emptyInner}>
                  {query ? `No matches for "${query}".` : "No works yet."}
                </Text>
              ) : (
                filteredWorks.map((work) => (
                  <Pressable
                    key={work.id}
                    onPress={() => router.push(`/works/${work.slug}`)}
                    style={({ pressed }) => [
                      styles.workListRow,
                      pressed && styles.workListRowPressed,
                    ]}
                    accessibilityRole="button"
                  >
                    <View style={styles.workListIcon}>
                      <Feather name="book" size={16} color={colors.accent} />
                    </View>
                    <View style={styles.workListText}>
                      <Text
                        style={styles.workListTitle}
                        numberOfLines={1}
                      >
                        {work.title}
                      </Text>
                      <Text style={styles.workListMeta}>
                        {work.workType} · {work.eraLabel} · {work.lengthLabel}
                      </Text>
                    </View>
                    <Feather
                      name="chevron-right"
                      size={16}
                      color={colors.inkSoft}
                    />
                  </Pressable>
                ))
              )}
            </CollapsibleSection>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function CollapsibleSection({
  label,
  count,
  open,
  onToggle,
  children,
}: {
  label: string;
  count?: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [
          styles.sectionHeader,
          pressed && { opacity: 0.7 },
        ]}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <View style={styles.sectionHeaderLeft}>
          <Eyebrow tone="accent">
            {label}
            {count != null ? ` · ${count}` : ""}
          </Eyebrow>
        </View>
        <Feather
          name={open ? "chevron-down" : "chevron-right"}
          size={18}
          color={colors.inkSoft}
        />
      </Pressable>
      {open ? <View style={styles.sectionBody}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  masthead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  viewTabs: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  viewTab: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  viewTabActive: {
    backgroundColor: "rgba(212, 168, 87, 0.12)",
  },
  viewTabLabel: {
    fontFamily: fonts.sans,
    fontSize: 9.5,
    fontWeight: "700",
    color: colors.inkSoft,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  viewTabLabelActive: { color: colors.accent },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing["6xl"] + spacing.lg,
    gap: spacing.lg,
  },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
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

  loading: { paddingVertical: spacing["2xl"], alignItems: "center" },

  placeholder: {
    paddingVertical: spacing["4xl"],
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    gap: spacing.sm,
  },
  placeholderTitle: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 24,
    color: colors.ink,
    marginTop: spacing.sm,
  },
  placeholderBody: {
    fontFamily: fonts.serif,
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: "center",
    maxWidth: 260,
    lineHeight: 22,
  },

  // Featured Father — editorial spread
  featuredFather: {
    gap: spacing.md,
  },
  fatherPortraitWrap: {
    height: 320,
    borderRadius: radii.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.lineGilt,
  },
  fatherPortrait: { width: "100%", height: "100%" },
  fatherPortraitPlaceholder: {
    backgroundColor: colors.surfaceStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  fatherPortraitLetter: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 96,
    color: colors.accent,
  },
  fatherPortraitOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.xs,
  },
  fatherName: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 30,
    color: colors.ink,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  fatherEra: {
    fontFamily: fonts.serifItalic,
    fontSize: 13,
    color: colors.inkMuted,
  },
  fatherSummary: {
    fontFamily: fonts.serif,
    fontSize: 15,
    lineHeight: 24,
    color: colors.inkMuted,
    paddingHorizontal: spacing.xs,
  },

  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  ctaLabel: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 2,
    textTransform: "uppercase",
  },

  // Featured work
  workTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  workTitle: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 26,
    color: colors.ink,
    letterSpacing: -0.4,
    lineHeight: 32,
  },
  workByline: {
    fontFamily: fonts.serifItalic,
    fontSize: 13,
    color: colors.inkMuted,
    marginTop: spacing.xs,
  },
  workSummary: {
    fontFamily: fonts.serif,
    fontSize: 14,
    lineHeight: 22,
    color: colors.inkMuted,
    marginTop: spacing.sm,
  },

  // Collapsible sections
  section: {
    backgroundColor: "transparent",
    borderRadius: radii.card,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.lineGilt,
  },
  sectionHeaderLeft: { flex: 1 },
  sectionBody: {
    gap: spacing.xs,
    paddingBottom: spacing.md,
  },

  emptyInner: {
    paddingVertical: spacing.lg,
    fontFamily: fonts.serifItalic,
    fontSize: 14,
    color: colors.inkSoft,
    textAlign: "center",
  },

  // Person rows
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  personRowPressed: {
    backgroundColor: "rgba(212, 168, 87, 0.05)",
    borderRadius: radii.card,
  },
  personIconImage: { width: "100%", height: "100%" },
  personIconLetter: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 22,
    color: colors.accent,
  },
  personMeta: { flex: 1, gap: 2 },
  personName: {
    fontFamily: fonts.serif,
    fontSize: 17,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  personEra: {
    fontFamily: fonts.serifItalic,
    fontSize: 12,
    color: colors.inkSoft,
  },

  // Work rows
  workListRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  workListRowPressed: {
    backgroundColor: "rgba(212, 168, 87, 0.05)",
    borderRadius: radii.card,
  },
  workListIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.card,
    backgroundColor: "rgba(212, 168, 87, 0.08)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
    alignItems: "center",
    justifyContent: "center",
  },
  workListText: { flex: 1, gap: 2 },
  workListTitle: {
    fontFamily: fonts.serif,
    fontSize: 15,
    color: colors.ink,
    letterSpacing: -0.1,
  },
  workListMeta: {
    fontFamily: fonts.serifItalic,
    fontSize: 11,
    color: colors.inkSoft,
  },
});

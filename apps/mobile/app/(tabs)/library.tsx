import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
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

import { Pill } from "@/components/theosis/pill";
import { colors, fonts, radii, spacing, text } from "@/constants/theosis-theme";
import { getApi } from "@/lib/api";

// Library tab — segmented browser of every Father / Saint / Work in the
// corpus. Tabs:
//   All     all people
//   Fathers people with kind === "father"
//   Saints  people with kind === "saint"
//   Works   every work, tappable → /works/[slug]
// Search box filters within the active tab.

type LibraryTab = "all" | "fathers" | "saints" | "works";

const TAB_ORDER: { key: LibraryTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "fathers", label: "Fathers" },
  { key: "saints", label: "Saints" },
  { key: "works", label: "Works" },
];

export default function LibraryScreen() {
  const api = getApi();
  const [tab, setTab] = useState<LibraryTab>("all");
  const [query, setQuery] = useState("");

  const peopleQuery = useQuery({
    queryKey: ["library-people"],
    queryFn: () => api.fetchLibraryPeople(),
    staleTime: 60 * 60 * 1000,
  });

  // Works only need to fetch when the Works tab is active. React Query
  // gates the request via `enabled` so switching to Works does the
  // network round-trip lazily on first selection.
  const libraryCatalogQuery = useQuery({
    queryKey: ["library-catalog"],
    queryFn: () => api.fetchLibraryCatalog(),
    enabled: tab === "works",
    staleTime: 60 * 60 * 1000,
  });

  const filteredPeople = useMemo(() => {
    const all = peopleQuery.data?.people ?? [];
    const q = query.trim().toLowerCase();
    const byKind = all.filter((p) => {
      if (tab === "fathers") return p.kind === "father";
      if (tab === "saints") return p.kind === "saint";
      // tab === "all" — include everyone including theologians.
      return true;
    });
    if (!q) return byKind;
    return byKind.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.honorific?.toLowerCase().includes(q) ?? false) ||
        p.eraLabel.toLowerCase().includes(q) ||
        p.kind.includes(q),
    );
  }, [peopleQuery.data, tab, query]);

  const filteredWorks = useMemo(() => {
    const all = libraryCatalogQuery.data?.works ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (w) =>
        w.title.toLowerCase().includes(q) ||
        w.shortTitle.toLowerCase().includes(q) ||
        w.eraLabel.toLowerCase().includes(q) ||
        w.workType.toLowerCase().includes(q),
    );
  }, [libraryCatalogQuery.data, query]);

  const activeQuery =
    tab === "works" ? libraryCatalogQuery : peopleQuery;
  const isEmpty =
    tab === "works"
      ? Boolean(libraryCatalogQuery.data) && filteredWorks.length === 0
      : Boolean(peopleQuery.data) && filteredPeople.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Library</Text>
        <Text style={styles.title}>Fathers, Saints &amp; Works</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={
            tab === "works" ? "Search works by title" : "Search by name or era"
          }
          placeholderTextColor={colors.inkSoft}
          style={styles.searchInput}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabRow}
        >
          {TAB_ORDER.map((t) => {
            const active = t.key === tab;
            return (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                style={({ pressed }) => [
                  styles.tabPill,
                  active && styles.tabPillActive,
                  pressed && !active && { opacity: 0.7 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Show ${t.label}`}
              >
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={activeQuery.isFetching && !activeQuery.isLoading}
            onRefresh={() => activeQuery.refetch()}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        {activeQuery.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : null}

        {activeQuery.error ? (
          <View style={styles.errorCard}>
            <Text style={text.eyebrow}>Couldn&apos;t load library</Text>
            <Text style={[text.body, { color: colors.error }]}>
              {activeQuery.error instanceof Error
                ? activeQuery.error.message
                : String(activeQuery.error)}
            </Text>
          </View>
        ) : null}

        {isEmpty ? (
          <View style={styles.emptyCard}>
            <Text style={[text.body, { textAlign: "center" }]}>
              {query
                ? `No matches for “${query}”.`
                : `No ${tab} yet.`}
            </Text>
          </View>
        ) : null}

        {tab !== "works"
          ? filteredPeople.map((person) => (
              <Pressable
                key={person.id}
                onPress={() => router.push(`/people/${person.slug}`)}
                style={({ pressed }) => [
                  styles.personRow,
                  pressed && styles.personRowPressed,
                ]}
                accessibilityLabel={`${person.name}, ${person.kind}`}
                accessibilityRole="button"
              >
                {person.icon ? (
                  <Image
                    source={{ uri: person.icon.src }}
                    style={styles.personIcon}
                    contentFit="cover"
                    transition={150}
                    accessibilityLabel={person.icon.alt}
                  />
                ) : (
                  <View style={[styles.personIcon, styles.personIconPlaceholder]}>
                    <Text style={styles.personIconLetter}>
                      {(person.name.match(/[A-Z]/) ?? [person.name[0]])[0]}
                    </Text>
                  </View>
                )}
                <View style={styles.personMeta}>
                  <Text style={styles.personName}>
                    {person.honorific ? `${person.honorific} ` : ""}
                    {person.name}
                  </Text>
                  <View style={styles.personSubrow}>
                    <Pill variant="subtle">{person.kind}</Pill>
                    <Text style={styles.personEra}>{person.eraLabel}</Text>
                  </View>
                </View>
              </Pressable>
            ))
          : filteredWorks.map((work) => (
              <Pressable
                key={work.id}
                onPress={() => router.push(`/works/${work.slug}`)}
                style={({ pressed }) => [
                  styles.workRow,
                  pressed && styles.workRowPressed,
                ]}
                accessibilityLabel={`${work.title}, ${work.workType}`}
                accessibilityRole="button"
              >
                <View style={styles.workTopRow}>
                  <Pill variant="subtle">{work.workType}</Pill>
                  <Text style={styles.workMeta}>
                    {work.eraLabel} · {work.lengthLabel}
                  </Text>
                </View>
                <Text style={styles.workTitle}>{work.title}</Text>
                {work.summary ? (
                  <Text style={styles.workSummary} numberOfLines={2}>
                    {work.summary}
                  </Text>
                ) : null}
              </Pressable>
            ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  eyebrow: {
    fontSize: 10.4,
    fontWeight: "500",
    color: colors.inkSoft,
    letterSpacing: 2.4,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 28,
    color: colors.ink,
    letterSpacing: -0.4,
    lineHeight: 32,
  },
  searchInput: {
    marginTop: spacing.sm,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    color: colors.ink,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
  },

  tabRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingTop: spacing.sm,
    paddingRight: spacing.lg,
  },
  tabPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  tabPillActive: {
    backgroundColor: colors.accentSoft,
    borderColor: "rgba(212, 168, 87, 0.4)",
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.inkMuted,
    letterSpacing: 0.4,
  },
  tabLabelActive: {
    color: colors.accent,
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing["4xl"],
    gap: spacing.sm,
  },

  loading: { paddingVertical: spacing["3xl"], alignItems: "center" },
  errorCard: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  emptyCard: {
    paddingVertical: spacing["3xl"],
    paddingHorizontal: spacing.lg,
  },

  personRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  personRowPressed: { backgroundColor: colors.surfaceStrong },
  personIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surfaceStrong,
  },
  personIconPlaceholder: { alignItems: "center", justifyContent: "center" },
  personIconLetter: {
    fontFamily: fonts.serif,
    fontSize: 22,
    color: colors.accent,
  },
  personMeta: { flex: 1, gap: 4 },
  personName: {
    fontFamily: fonts.serif,
    fontSize: 18,
    color: colors.ink,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  personSubrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  personEra: {
    fontSize: 11,
    color: colors.inkSoft,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },

  workRow: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  workRowPressed: { backgroundColor: colors.surfaceStrong },
  workTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  workMeta: {
    fontSize: 11,
    color: colors.inkSoft,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  workTitle: {
    fontFamily: fonts.serif,
    fontSize: 18,
    color: colors.ink,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  workSummary: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.inkMuted,
  },
});

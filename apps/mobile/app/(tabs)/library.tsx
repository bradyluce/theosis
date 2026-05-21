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

// Library tab — searchable list of every Father / Saint / theologian in
// the corpus. Tapping a row pushes /people/[slug] (a stack route outside
// the tabs group) with a back button on the detail screen.
//
// Each row shows: round icon (or initial in accent gold if uniconed),
// honorific + name, kind + era.
//
// Scoped out: works grid, topic filter, sort options. Coming as the
// person detail screen + Library expansion lands.

export default function LibraryScreen() {
  const api = getApi();
  const [query, setQuery] = useState("");

  const peopleQuery = useQuery({
    queryKey: ["library-people"],
    queryFn: () => api.fetchLibraryPeople(),
    staleTime: 60 * 60 * 1000,
  });

  const filtered = useMemo(() => {
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

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Library</Text>
        <Text style={styles.title}>Fathers and Saints</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or era"
          placeholderTextColor={colors.inkSoft}
          style={styles.searchInput}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
      </View>

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
        {peopleQuery.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : null}

        {peopleQuery.error ? (
          <View style={styles.errorCard}>
            <Text style={text.eyebrow}>Couldn't load library</Text>
            <Text style={[text.body, { color: colors.error }]}>
              {peopleQuery.error instanceof Error
                ? peopleQuery.error.message
                : String(peopleQuery.error)}
            </Text>
          </View>
        ) : null}

        {peopleQuery.data && filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={[text.body, { textAlign: "center" }]}>
              No matches for &ldquo;{query}&rdquo;.
            </Text>
          </View>
        ) : null}

        {filtered.map((person) => (
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
    paddingBottom: spacing.lg,
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
  personRowPressed: {
    backgroundColor: colors.surfaceStrong,
  },
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
});

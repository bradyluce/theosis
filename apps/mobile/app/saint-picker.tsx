// Searchable picker for the patron saint. Opens as a modal from Settings
// or from the onboarding patron step. Writes the chosen saint slug into
// updateProfilePrefs() and pops back — the calling screen re-reads on
// focus and shows the new selection.
//
// Reuses /api/library/people (cached for an hour) so the list is instant
// after the first Library tab visit.

import Feather from "@expo/vector-icons/Feather";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Stack, router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItemInfo,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Eyebrow, GiltRule, Wordmark } from "@/components/theosis/primitives";
import { colors, fonts, radii, spacing } from "@/constants/theosis-theme";
import { getApi } from "@/lib/api";
import { updateProfilePrefs } from "@/lib/preferences";

type Person = {
  id: string;
  slug: string;
  name: string;
  honorific?: string | null;
  eraLabel?: string | null;
  kind?: string | null;
  feastDayLabel?: string | null;
  summary?: string | null;
  icon?: { src: string; alt: string } | null;
};

export default function SaintPickerScreen() {
  const api = getApi();
  const peopleQuery = useQuery({
    queryKey: ["library-people"],
    queryFn: () => api.fetchLibraryPeople(),
    staleTime: 60 * 60 * 1000,
  });

  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const people = (peopleQuery.data?.people ?? []) as Person[];
    if (!query.trim()) return people;
    const q = query.toLowerCase();
    return people.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.eraLabel ?? "").toLowerCase().includes(q) ||
        (p.feastDayLabel ?? "").toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q),
    );
  }, [peopleQuery.data, query]);

  async function handlePick(slug: string) {
    await updateProfilePrefs({ patronSaintSlug: slug });
    router.back();
  }

  function handleClear() {
    void updateProfilePrefs({ patronSaintSlug: undefined });
    router.back();
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Masthead */}
      <View style={styles.masthead}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={({ pressed }) => [
            styles.iconButton,
            pressed && { opacity: 0.6 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Feather name="x" size={20} color={colors.inkMuted} />
        </Pressable>
        <Wordmark size={16} subline="Patron Saint" />
        <Pressable
          onPress={handleClear}
          hitSlop={10}
          style={({ pressed }) => [
            styles.iconButton,
            pressed && { opacity: 0.6 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Clear selection"
        >
          <Text style={styles.clearLabel}>Clear</Text>
        </Pressable>
      </View>
      <GiltRule full style={{ marginHorizontal: spacing.xl }} />

      {/* Search */}
      <View style={styles.searchWrap}>
        <Feather
          name="search"
          size={15}
          color={colors.inkSoft}
          style={{ marginRight: spacing.sm }}
        />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search saints, era, or feast day"
          placeholderTextColor={colors.inkSoft}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {query.length > 0 ? (
          <Pressable
            onPress={() => setQuery("")}
            hitSlop={8}
            style={({ pressed }) => [pressed && { opacity: 0.6 }]}
            accessibilityLabel="Clear search"
          >
            <Feather name="x-circle" size={16} color={colors.inkSoft} />
          </Pressable>
        ) : null}
      </View>

      {peopleQuery.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.loadingLabel}>Loading saints…</Text>
        </View>
      ) : peopleQuery.isError ? (
        <View style={styles.loading}>
          <Eyebrow tone="oxblood">Couldn&apos;t load</Eyebrow>
          <Text style={styles.loadingLabel}>
            Pull down to retry, or close and re-open this picker.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(p) => p.id}
          renderItem={(info: ListRenderItemInfo<Person>) => (
            <SaintRow person={info.item} onPick={handlePick} />
          )}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.loading}>
              <Eyebrow tone="soft">No matches</Eyebrow>
              <Text style={styles.loadingLabel}>
                Try a shorter search, or browse the Library.
              </Text>
            </View>
          }
          keyboardShouldPersistTaps="handled"
        />
      )}
    </SafeAreaView>
  );
}

function SaintRow({
  person,
  onPick,
}: {
  person: Person;
  onPick: (slug: string) => void;
}) {
  const displayName = person.honorific
    ? `${person.honorific} ${person.name.split(",")[0]}`
    : person.name.split(",")[0];

  return (
    <Pressable
      onPress={() => onPick(person.slug)}
      style={({ pressed }) => [
        styles.row,
        pressed && { backgroundColor: colors.surfaceStrong },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Set patron to ${displayName}`}
    >
      <View style={styles.avatar}>
        {person.icon ? (
          <Image
            source={{ uri: person.icon.src }}
            style={styles.avatarImage}
            contentFit="cover"
            transition={140}
          />
        ) : (
          <Text style={styles.avatarLetter}>{person.name.charAt(0)}</Text>
        )}
      </View>
      <View style={styles.rowMain}>
        <Text style={styles.rowName} numberOfLines={1}>
          {displayName}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {[person.eraLabel, person.feastDayLabel].filter(Boolean).join(" · ")}
        </Text>
      </View>
      <Feather name="chevron-right" size={16} color={colors.inkSoft} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  masthead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  iconButton: {
    minWidth: 36,
    minHeight: 32,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  clearLabel: {
    fontFamily: fonts.serif,
    fontSize: 13,
    color: colors.oxbloodInk,
    fontWeight: "600",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.ink,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing["4xl"],
  },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%" },
  avatarLetter: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 18,
    color: colors.accent,
  },
  rowMain: { flex: 1, gap: 2 },
  rowName: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  rowMeta: {
    fontSize: 12,
    color: colors.inkMuted,
    fontStyle: "italic",
  },
  loading: {
    paddingTop: spacing["3xl"],
    alignItems: "center",
    gap: spacing.sm,
  },
  loadingLabel: {
    fontSize: 13,
    color: colors.inkMuted,
    textAlign: "center",
    paddingHorizontal: spacing.xl,
  },
});

import Feather from "@expo/vector-icons/Feather";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Eyebrow, GiltRule, Halo } from "@/components/theosis/primitives";
import { colors, fonts, radii, spacing } from "@/constants/theosis-theme";
import { getApi } from "@/lib/api";

// Searchable list of every library-worthy Person. The Library tab points
// here from its Browse-all section. Differs from the search tab in that
// this is *just* people — no Scripture, no commentary, no daily entries.

export default function PeopleBrowseScreen() {
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
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Fathers & Saints",
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
            placeholder="Search by name, era, kind"
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
            {peopleQuery.isLoading
              ? "Loading"
              : `${filtered.length} ${filtered.length === 1 ? "person" : "people"}`}
          </Eyebrow>
        </View>
        <GiltRule style={{ marginHorizontal: spacing.xl }} />

        {peopleQuery.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <FlatList
            style={styles.list}
            contentContainerStyle={styles.listContent}
            data={filtered}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => router.push(`/people/${item.slug}`)}
                style={({ pressed }) => [
                  styles.personRow,
                  pressed && styles.personRowPressed,
                ]}
                accessibilityRole="button"
              >
                {item.icon ? (
                  <Halo size={48} glow={false} ringTone="muted">
                    <Image
                      source={{ uri: item.icon.src }}
                      style={styles.iconImage}
                      contentFit="cover"
                      transition={150}
                      accessibilityLabel={item.icon.alt}
                    />
                  </Halo>
                ) : (
                  <Halo size={48} glow={false} ringTone="muted">
                    <Text style={styles.iconLetter}>{item.name.charAt(0)}</Text>
                  </Halo>
                )}
                <View style={styles.personMeta}>
                  <Text style={styles.personName} numberOfLines={1}>
                    {item.honorific ? `${item.honorific} ` : ""}
                    {item.name}
                  </Text>
                  <Text style={styles.personEra}>
                    {item.kind} · {item.eraLabel}
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.inkSoft} />
              </Pressable>
            )}
            ListEmptyComponent={
              query ? (
                <View style={styles.emptyState}>
                  <Eyebrow tone="soft">No matches</Eyebrow>
                  <Text style={styles.emptyHint}>
                    No saints or Fathers match &ldquo;{query}&rdquo;.
                  </Text>
                </View>
              ) : null
            }
          />
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

  list: { flex: 1 },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing["3xl"],
  },

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
  iconImage: { width: "100%", height: "100%" },
  iconLetter: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 22,
    color: colors.accent,
  },
  personMeta: { flex: 1, gap: 2 },
  personName: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.ink,
    letterSpacing: -0.1,
  },
  personEra: {
    fontFamily: fonts.serifItalic,
    fontSize: 12,
    color: colors.inkSoft,
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

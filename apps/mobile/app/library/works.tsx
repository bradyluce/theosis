import Feather from "@expo/vector-icons/Feather";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Eyebrow, GiltRule } from "@/components/theosis/primitives";
import { colors, fonts, radii, spacing } from "@/constants/theosis-theme";
import { getApi } from "@/lib/api";

// Searchable list of every Work with long-form chapters. Commentary-only
// titles are excluded (they have no readable chapter body).

export default function WorksBrowseScreen() {
  const api = getApi();
  const [query, setQuery] = useState("");

  const catalogQuery = useQuery({
    queryKey: ["library-catalog"],
    queryFn: () => api.fetchLibraryCatalog(),
    staleTime: 60 * 60 * 1000,
  });

  const works = useMemo(() => {
    const byWork = catalogQuery.data?.index?.byWork;
    if (!byWork) return [];
    return (catalogQuery.data?.works ?? [])
      .filter((w) => byWork[w.id] != null)
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [catalogQuery.data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return works;
    return works.filter(
      (w) =>
        w.title.toLowerCase().includes(q) ||
        w.shortTitle.toLowerCase().includes(q) ||
        w.eraLabel.toLowerCase().includes(q) ||
        w.workType.toLowerCase().includes(q),
    );
  }, [works, query]);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Works",
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
            placeholder="Search title, era, work type"
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
            {catalogQuery.isLoading
              ? "Loading"
              : `${filtered.length} ${filtered.length === 1 ? "work" : "works"}`}
          </Eyebrow>
        </View>
        <GiltRule style={{ marginHorizontal: spacing.xl }} />

        {catalogQuery.isLoading ? (
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
                onPress={() => router.push(`/works/${item.slug}`)}
                style={({ pressed }) => [
                  styles.workRow,
                  pressed && styles.workRowPressed,
                ]}
                accessibilityRole="button"
              >
                <View style={styles.workIcon}>
                  <Feather name="book" size={16} color={colors.accent} />
                </View>
                <View style={styles.workText}>
                  <Text style={styles.workTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.workMeta} numberOfLines={1}>
                    {item.workType} · {item.eraLabel} · {item.lengthLabel}
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
                    No works match &ldquo;{query}&rdquo;.
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

  workRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  workRowPressed: {
    backgroundColor: "rgba(212, 168, 87, 0.05)",
    borderRadius: radii.card,
  },
  workIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.card,
    backgroundColor: "rgba(212, 168, 87, 0.08)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
    alignItems: "center",
    justifyContent: "center",
  },
  workText: { flex: 1, gap: 2 },
  workTitle: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.ink,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  workMeta: {
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

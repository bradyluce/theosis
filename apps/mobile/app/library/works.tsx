import Feather from "@expo/vector-icons/Feather";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
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
import { type CompletionMark, getCompletions } from "@/lib/preferences";

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

  // Map of workId → number of chapters the user has marked read.
  // Re-read on focus so newly-marked chapters update the badges
  // without needing a fresh mount.
  const [completions, setCompletions] = useState<CompletionMark[]>([]);
  useFocusEffect(
    useCallback(() => {
      let canceled = false;
      void getCompletions().then((all) => {
        if (!canceled) setCompletions(all);
      });
      return () => {
        canceled = true;
      };
    }, []),
  );
  const completedByWork = useMemo<Map<string, number>>(() => {
    const map = new Map<string, number>();
    for (const c of completions) {
      if (c.kind !== "work-chapter") continue;
      // slug shape is "<workId>::<order>" — extract workId.
      const idx = c.slug.indexOf("::");
      if (idx < 0) continue;
      const workId = c.slug.slice(0, idx);
      map.set(workId, (map.get(workId) ?? 0) + 1);
    }
    return map;
  }, [completions]);
  // chapter count per work, derived from the catalog index.
  const totalChaptersByWork = useMemo<Map<string, number>>(() => {
    const map = new Map<string, number>();
    const byWork = catalogQuery.data?.index?.byWork;
    if (!byWork) return map;
    for (const [workId, entries] of Object.entries(byWork)) {
      if (Array.isArray(entries)) {
        map.set(workId, entries.length);
      }
    }
    return map;
  }, [catalogQuery.data]);

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
            renderItem={({ item }) => {
              const read = completedByWork.get(item.id) ?? 0;
              const total = totalChaptersByWork.get(item.id) ?? 0;
              const fullyRead = total > 0 && read === total;
              return (
                <Pressable
                  onPress={() => router.push(`/works/${item.slug}`)}
                  style={({ pressed }) => [
                    styles.workRow,
                    pressed && styles.workRowPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={
                    read > 0
                      ? `${item.title} — ${read} of ${total} chapters read`
                      : item.title
                  }
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
                  {read > 0 ? (
                    <View
                      style={[
                        styles.readBadge,
                        fullyRead && styles.readBadgeFull,
                      ]}
                    >
                      {fullyRead ? (
                        <Feather
                          name="check"
                          size={10}
                          color={colors.background}
                        />
                      ) : null}
                      <Text
                        style={[
                          styles.readBadgeLabel,
                          fullyRead && styles.readBadgeLabelFull,
                        ]}
                      >
                        {fullyRead
                          ? "Read"
                          : `${read}/${total > 0 ? total : "?"}`}
                      </Text>
                    </View>
                  ) : null}
                  <Feather name="chevron-right" size={16} color={colors.inkSoft} />
                </Pressable>
              );
            }}
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
  readBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
  },
  readBadgeFull: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  readBadgeLabel: {
    fontFamily: fonts.sans,
    fontSize: 9.5,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  readBadgeLabelFull: { color: colors.background },
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

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

// Browse every curated topic landing page. Search filters by label and
// summary text.

export default function TopicsBrowseScreen() {
  const api = getApi();
  const [query, setQuery] = useState("");

  const topicsQuery = useQuery({
    queryKey: ["topics-index"],
    queryFn: () => api.fetchTopics(),
    staleTime: 60 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    const all = topicsQuery.data?.topics ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (t) =>
        t.label.toLowerCase().includes(q) ||
        t.summary.toLowerCase().includes(q) ||
        (t.subtitle?.toLowerCase().includes(q) ?? false),
    );
  }, [topicsQuery.data, query]);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Topics",
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
            placeholder="Search topics"
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
            {topicsQuery.isLoading
              ? "Loading"
              : `${filtered.length} ${filtered.length === 1 ? "topic" : "topics"}`}
          </Eyebrow>
        </View>
        <GiltRule style={{ marginHorizontal: spacing.xl }} />

        {topicsQuery.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <FlatList
            style={styles.list}
            contentContainerStyle={styles.listContent}
            data={filtered}
            keyExtractor={(item) => item.slug}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => router.push(`/topics/${item.slug}`)}
                style={({ pressed }) => [
                  styles.topicRow,
                  pressed && styles.topicRowPressed,
                ]}
                accessibilityRole="button"
              >
                <View style={styles.topicText}>
                  <Text style={styles.topicLabel}>{item.label}</Text>
                  {item.subtitle ? (
                    <Text style={styles.topicSubtitle} numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                  ) : null}
                  <Text style={styles.topicSummary} numberOfLines={2}>
                    {item.summary}
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
                    No topics match &ldquo;{query}&rdquo;.
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

  topicRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  topicRowPressed: {
    backgroundColor: "rgba(212, 168, 87, 0.05)",
    borderRadius: radii.card,
  },
  topicText: { flex: 1, gap: 4 },
  topicLabel: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 19,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  topicSubtitle: {
    fontFamily: fonts.serifItalic,
    fontSize: 13,
    color: colors.accent,
  },
  topicSummary: {
    fontFamily: fonts.serif,
    fontSize: 14,
    lineHeight: 20,
    color: colors.inkMuted,
    marginTop: 2,
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

// "Ask the Fathers" — semantic search over the patristic corpus. The user
// poses a question or theme; we POST it to /api/search/fathers, which embeds
// the query with a local model and returns the nearest real writings ranked by
// meaning. Retrieval-only: there is NO generated answer — every row is an
// actual catalogued passage the user can open and read in full.

import Feather from "@expo/vector-icons/Feather";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { type Href, Stack, router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { SearchResult } from "@theosis/core";

import { Eyebrow, GiltRule, Wordmark } from "@/components/theosis/primitives";
import { colors, fonts, radii, spacing } from "@/constants/theosis-theme";
import { getApi } from "@/lib/api";
import { resolveMobileTarget } from "@/lib/search-target";

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

const SUGGESTIONS = [
  "Overcoming despair",
  "How should I pray?",
  "Dealing with anger",
  "What is humility?",
  "Facing death without fear",
  "Forgiving those who wrong me",
];

export default function AskFathersScreen() {
  const api = getApi();
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query.trim(), 300);
  const enabled = debounced.length >= 3;

  const search = useQuery({
    queryKey: ["ask-fathers", debounced],
    queryFn: () => api.searchFathers(debounced),
    enabled,
    staleTime: 60 * 1000,
  });

  const results = search.data?.results ?? [];
  const showEmpty =
    enabled && !search.isLoading && !search.error && results.length === 0;

  const onResultPress = (result: SearchResult) => {
    const href = resolveMobileTarget(result);
    if (href) router.push(href as Href);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={[
          "rgba(212, 168, 87, 0.12)",
          "rgba(139, 58, 58, 0.03)",
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
        <Wordmark size={16} subline="Ask the Fathers" />
        <View style={styles.mastheadSpacer} />
      </View>
      <GiltRule full style={{ marginHorizontal: spacing.xl }} />

      <View style={styles.searchWrap}>
        <View style={styles.searchRow}>
          <Feather name="search" size={16} color={colors.inkSoft} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Ask anything — grief, prayer, doubt…"
            placeholderTextColor={colors.inkSoft}
            style={styles.searchInput}
            autoCorrect
            autoCapitalize="sentences"
            returnKeyType="search"
            autoFocus
          />
          {query ? (
            <Pressable
              onPress={() => setQuery("")}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Clear"
            >
              <Feather name="x" size={16} color={colors.inkSoft} />
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.disclaimer}>
          Every result is a real writing from the Fathers, ranked by meaning —
          not an AI answer.
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!enabled ? (
          <View style={styles.suggestWrap}>
            <Eyebrow tone="accent">Try asking</Eyebrow>
            <View style={styles.suggestChips}>
              {SUGGESTIONS.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setQuery(s)}
                  style={({ pressed }) => [
                    styles.suggestChip,
                    pressed && { opacity: 0.7 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Ask: ${s}`}
                >
                  <Text style={styles.suggestChipLabel}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {search.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : null}

        {search.error ? (
          <View style={styles.stateCard}>
            <Eyebrow tone="oxblood">Search failed</Eyebrow>
            <Text style={styles.stateHint}>
              {search.error instanceof Error
                ? search.error.message
                : String(search.error)}
            </Text>
          </View>
        ) : null}

        {showEmpty ? (
          <View style={styles.stateCard}>
            <Eyebrow tone="accent">No writings found</Eyebrow>
            <Text style={styles.stateHint}>
              Try rephrasing, or ask about a virtue, a struggle, or a question
              of the faith.
            </Text>
          </View>
        ) : null}

        {results.length > 0 ? (
          <View style={styles.results}>
            {results.map((result) => {
              const tappable = resolveMobileTarget(result) !== null;
              return (
                <Pressable
                  key={result.id}
                  onPress={tappable ? () => onResultPress(result) : undefined}
                  style={({ pressed }) => [
                    styles.resultRow,
                    pressed && tappable && { opacity: 0.7 },
                    !tappable && { opacity: 0.55 },
                  ]}
                  accessibilityRole={tappable ? "button" : "text"}
                  accessibilityLabel={result.title}
                >
                  <View style={styles.resultText}>
                    <Text style={styles.resultKicker}>
                      {result.kicker || result.kind}
                    </Text>
                    <Text style={styles.resultTitle}>{result.title}</Text>
                    {result.snippet ? (
                      <Text style={styles.resultSnippet} numberOfLines={3}>
                        {result.snippet}
                      </Text>
                    ) : null}
                  </View>
                  {tappable ? (
                    <Feather
                      name="chevron-right"
                      size={14}
                      color={colors.inkSoft}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}
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

  searchWrap: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    color: colors.ink,
    fontSize: 15,
    fontFamily: fonts.serif,
  },
  disclaimer: {
    fontFamily: fonts.serifItalic,
    fontSize: 12,
    lineHeight: 17,
    color: colors.inkSoft,
    paddingHorizontal: spacing.xs,
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing["4xl"],
  },

  suggestWrap: { gap: spacing.md, paddingTop: spacing.sm },
  suggestChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  suggestChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
    backgroundColor: "rgba(212, 168, 87, 0.05)",
  },
  suggestChipLabel: {
    fontFamily: fonts.serif,
    fontSize: 14,
    color: colors.ink,
  },

  loading: { paddingVertical: spacing["3xl"], alignItems: "center" },
  stateCard: { paddingVertical: spacing["2xl"], gap: spacing.sm },
  stateHint: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.inkMuted,
  },

  results: { gap: 0 },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  resultText: { flex: 1, gap: 4 },
  resultKicker: {
    fontFamily: fonts.sans,
    fontSize: 9.5,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  resultTitle: {
    fontFamily: fonts.serif,
    fontSize: 17,
    color: colors.ink,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  resultSnippet: {
    fontFamily: fonts.serifItalic,
    fontSize: 13,
    lineHeight: 20,
    color: colors.inkSoft,
  },
});

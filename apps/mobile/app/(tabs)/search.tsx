import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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
import type { SearchResult, SearchResultKind } from "@theosis/core";

import { Pill } from "@/components/theosis/pill";
import { colors, fonts, radii, spacing, text } from "@/constants/theosis-theme";
import { getApi } from "@/lib/api";

// Server-side search via /api/search. The query input debounces 200ms
// before firing — feels instant, doesn't flood the server. Results group
// by kind (Verses, Commentary, People, Works, Topics, Daily). Tapping a
// result navigates: people → person detail, verses/commentary → Bible
// reader at the right chapter, works → person detail of the work's
// author (TBD when a work detail screen exists).
//
// The underlying search engine indexes seed data only today
// (src/features/search/search-engine.ts) — so results are intentionally
// narrow. Broader coverage of the 65k normalized commentary entries is
// a phase-4 enhancement that lands when the engine itself grows.

// Order results render in. Verses first because they're the most
// directly actionable; people second; everything else after.
const KIND_ORDER: SearchResultKind[] = [
  "verse",
  "person",
  "commentary",
  "work",
  "topic",
  "daily",
];

const KIND_LABELS: Record<SearchResultKind, string> = {
  verse: "Verses",
  commentary: "Commentary",
  person: "People",
  work: "Works",
  topic: "Topics",
  daily: "Daily",
};

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

// Map a web href to a mobile route + params. Returns null if the result
// kind doesn't have a mobile destination yet.
function resolveMobileTarget(result: SearchResult): string | null {
  // Person detail: /library/people/<slug> → /people/<slug>
  const personMatch = result.href.match(/^\/library\/people\/([^/?#]+)/);
  if (personMatch) return `/people/${personMatch[1]}`;

  // Verse / Bible passage: /bible/<translation>/<book>/<chapter>[#verse-id]
  const bibleMatch = result.href.match(
    /^\/bible\/([^/]+)\/([^/]+)\/(\d+)(?:#[^:]+:[^.]+\.\d+\.(\d+))?/,
  );
  if (bibleMatch) {
    const [, translation, book, chapter, verse] = bibleMatch;
    const highlight = verse ? `&highlight=${verse}` : "";
    return `/explore?translation=${translation}&book=${book}&chapter=${chapter}${highlight}`;
  }

  // Work / Topic / Daily: no mobile destinations yet — return null so the
  // row isn't tappable.
  return null;
}

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounced(query.trim(), 200);
  const api = getApi();

  const searchQuery = useQuery({
    queryKey: ["search", debouncedQuery],
    queryFn: () => api.search(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 30 * 1000,
  });

  const grouped = useMemo(() => {
    const map = new Map<SearchResultKind, SearchResult[]>();
    for (const result of searchQuery.data?.results ?? []) {
      const list = map.get(result.kind) ?? [];
      list.push(result);
      map.set(result.kind, list);
    }
    return KIND_ORDER
      .filter((kind) => map.has(kind))
      .map((kind) => ({
        kind,
        label: KIND_LABELS[kind],
        results: map.get(kind) ?? [],
      }));
  }, [searchQuery.data]);

  const onResultPress = (result: SearchResult) => {
    const href = resolveMobileTarget(result);
    if (!href) return;
    router.push(href);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Search</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Try “logos”, “Augustine”, or “Matt 5:3”"
          placeholderTextColor={colors.inkSoft}
          style={styles.input}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          autoFocus
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!debouncedQuery ? (
          <View style={styles.emptyState}>
            <Text style={text.eyebrow}>Tips</Text>
            <Text style={styles.emptyHint}>
              Search names, topics, or scripture references like &ldquo;John 1:1&rdquo;.
            </Text>
            <Text style={styles.emptyHint}>
              Try: <Text style={styles.emptyExample}>logos</Text>,{" "}
              <Text style={styles.emptyExample}>Augustine</Text>,{" "}
              <Text style={styles.emptyExample}>Chrysostom</Text>.
            </Text>
          </View>
        ) : null}

        {debouncedQuery.length >= 2 && searchQuery.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : null}

        {searchQuery.error ? (
          <View style={styles.errorCard}>
            <Text style={text.eyebrow}>Search failed</Text>
            <Text style={[text.body, { color: colors.error }]}>
              {searchQuery.error instanceof Error
                ? searchQuery.error.message
                : String(searchQuery.error)}
            </Text>
          </View>
        ) : null}

        {debouncedQuery.length >= 2 &&
        !searchQuery.isLoading &&
        grouped.length === 0 &&
        searchQuery.data ? (
          <View style={styles.emptyState}>
            <Text style={text.eyebrow}>No matches</Text>
            <Text style={styles.emptyHint}>
              Search currently covers curated seed content. Broader coverage
              of the 65,000+ commentary entries is coming.
            </Text>
          </View>
        ) : null}

        {grouped.map((group) => (
          <View key={group.kind} style={styles.section}>
            <Text style={styles.sectionLabel}>{group.label}</Text>
            {group.results.map((result) => {
              const tappable = resolveMobileTarget(result) !== null;
              return (
                <Pressable
                  key={result.id}
                  onPress={tappable ? () => onResultPress(result) : undefined}
                  style={({ pressed }) => [
                    styles.resultCard,
                    pressed && tappable && styles.resultCardPressed,
                    !tappable && styles.resultCardDisabled,
                  ]}
                  accessibilityRole={tappable ? "button" : "text"}
                  accessibilityLabel={result.title}
                >
                  <View style={styles.resultMeta}>
                    <Pill variant="subtle">{result.kicker || result.kind}</Pill>
                  </View>
                  <Text style={styles.resultTitle}>{result.title}</Text>
                  {result.snippet ? (
                    <Text style={styles.resultSnippet} numberOfLines={3}>
                      {result.snippet}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
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
  input: {
    marginTop: spacing.sm,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    color: colors.ink,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing["4xl"],
    gap: spacing["2xl"],
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

  emptyState: {
    paddingVertical: spacing["2xl"],
    gap: spacing.sm,
  },
  emptyHint: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.inkMuted,
  },
  emptyExample: {
    fontFamily: fonts.mono,
    color: colors.accent,
    fontSize: 13,
  },

  section: { gap: spacing.sm },
  sectionLabel: {
    fontFamily: fonts.serif,
    fontSize: 18,
    color: colors.accent,
    letterSpacing: -0.2,
  },

  resultCard: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  resultCardPressed: {
    backgroundColor: colors.surfaceStrong,
  },
  resultCardDisabled: {
    opacity: 0.7,
  },
  resultMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  resultTitle: {
    fontFamily: fonts.serif,
    fontSize: 17,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  resultSnippet: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.inkMuted,
  },
});

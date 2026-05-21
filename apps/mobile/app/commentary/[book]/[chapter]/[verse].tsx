import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Pill } from "@/components/theosis/pill";
import { colors, fonts, radii, spacing, text } from "@/constants/theosis-theme";
import { getApi } from "@/lib/api";

// Verse commentary modal. Presented modally from the Bible reader when the
// user taps a verse with the gold dot. Fetches the per-verse file and the
// commentary catalog (cached) to resolve personId/workId/sourceId into
// human-readable labels.
//
// Each entry is rendered as a card: father name, work title, excerpt.
// Cards are ordered by rank (highest first), matching the web's
// directByLocation sort.

const BOOK_LABELS: Record<string, string> = {
  matthew: "Matthew",
  mark: "Mark",
  luke: "Luke",
  john: "John",
  genesis: "Genesis",
  exodus: "Exodus",
  psalms: "Psalms",
  proverbs: "Proverbs",
  isaiah: "Isaiah",
  romans: "Romans",
};
function bookLabel(slug: string) {
  return (
    BOOK_LABELS[slug] ??
    slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export default function CommentaryModal() {
  const params = useLocalSearchParams<{
    book: string;
    chapter: string;
    verse: string;
  }>();
  const bookSlug = params.book;
  const chapterNumber = Number.parseInt(params.chapter ?? "", 10);
  const verseNumber = Number.parseInt(params.verse ?? "", 10);

  const api = getApi();

  const verseQuery = useQuery({
    queryKey: ["verse-commentary", bookSlug, chapterNumber, verseNumber],
    queryFn: () =>
      api.fetchVerseCommentary(bookSlug, chapterNumber, verseNumber),
    enabled:
      Boolean(bookSlug) &&
      Number.isFinite(chapterNumber) &&
      Number.isFinite(verseNumber),
    staleTime: 60 * 60 * 1000,
  });

  const catalogQuery = useQuery({
    queryKey: ["commentary-catalog"],
    queryFn: () => api.fetchCommentaryCatalog(),
    staleTime: 60 * 60 * 1000,
  });

  // Build lookup maps from the catalog so each entry can show a father
  // name + work title without an additional fetch.
  const lookups = useMemo(() => {
    const peopleById = new Map<string, { name: string; honorific?: string }>();
    const worksById = new Map<string, { title: string; shortTitle: string }>();
    if (catalogQuery.data) {
      for (const person of catalogQuery.data.people) {
        peopleById.set(person.id, {
          name: person.name,
          honorific: person.honorific,
        });
      }
      for (const work of catalogQuery.data.works) {
        worksById.set(work.id, {
          title: work.title,
          shortTitle: work.shortTitle,
        });
      }
    }
    return { peopleById, worksById };
  }, [catalogQuery.data]);

  // Catena entries on a range emit per-verse copies (-v3, -v4, ...). Dedupe
  // by base id so the modal doesn't show the same comment thrice — matches
  // the web's getCommentaryEntriesForWork dedupe at render time.
  const sortedUniqueEntries = useMemo(() => {
    if (!verseQuery.data) return [];
    const seen = new Set<string>();
    const result = [];
    for (const entry of verseQuery.data.entries) {
      const baseId = entry.id.replace(/-v\d+$/, "");
      if (seen.has(baseId)) continue;
      seen.add(baseId);
      result.push(entry);
    }
    return result.sort((a, b) => b.rank - a.rank);
  }, [verseQuery.data]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerLabel}>
          <Text style={styles.eyebrow}>Commentary</Text>
          <Text style={styles.reference}>
            {bookSlug ? bookLabel(bookSlug) : ""} {chapterNumber}:{verseNumber}
          </Text>
        </View>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [
            styles.closeButton,
            pressed && { opacity: 0.5 },
          ]}
          accessibilityLabel="Close"
        >
          <Text style={styles.closeGlyph}>×</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {verseQuery.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : null}

        {verseQuery.error ? (
          <View style={styles.errorCard}>
            <Text style={text.eyebrow}>Couldn't load commentary</Text>
            <Text style={[text.body, { color: colors.error }]}>
              {verseQuery.error instanceof Error
                ? verseQuery.error.message
                : String(verseQuery.error)}
            </Text>
          </View>
        ) : null}

        {!verseQuery.isLoading && sortedUniqueEntries.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={[text.body, { textAlign: "center" }]}>
              No commentary on this verse yet.
            </Text>
          </View>
        ) : null}

        {sortedUniqueEntries.map((entry) => {
          const person = lookups.peopleById.get(entry.personId);
          const work = lookups.worksById.get(entry.workId);
          return (
            <View key={entry.id} style={styles.entryCard}>
              <View style={styles.entryMeta}>
                <Text style={styles.entryPerson}>
                  {person
                    ? person.honorific
                      ? `${person.honorific} ${person.name}`
                      : person.name
                    : entry.personId}
                </Text>
                {work ? (
                  <Text style={styles.entryWork}>{work.shortTitle}</Text>
                ) : null}
              </View>
              {entry.title ? (
                <Text style={styles.entryTitle}>{entry.title}</Text>
              ) : null}
              <Text style={styles.entryExcerpt}>{entry.excerpt}</Text>
              {entry.tags.length > 0 ? (
                <View style={styles.tagRow}>
                  {entry.tags.slice(0, 3).map((tag) => (
                    <Pill key={tag} variant="subtle">
                      {tag}
                    </Pill>
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  headerLabel: { flex: 1, gap: 2 },
  eyebrow: {
    fontSize: 9.5,
    fontWeight: "500",
    color: colors.inkSoft,
    letterSpacing: 2.4,
    textTransform: "uppercase",
  },
  reference: {
    fontFamily: fonts.serif,
    fontSize: 20,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
  closeGlyph: {
    fontSize: 22,
    color: colors.inkMuted,
    lineHeight: 22,
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing["4xl"],
    gap: spacing.md,
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

  entryCard: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  entryMeta: { gap: 4 },
  entryPerson: {
    fontFamily: fonts.serif,
    fontSize: 17,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  entryWork: {
    fontSize: 11,
    color: colors.inkSoft,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  entryTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.accent,
    letterSpacing: -0.1,
  },
  entryExcerpt: {
    fontSize: 15,
    lineHeight: 25,
    color: colors.inkMuted,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
});

import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, fonts, radii, spacing, text } from "@/constants/theosis-theme";
import { getApi } from "@/lib/api";

// Bible reader — mobile port of src/app/(shell)/bible/[translation]/[book]/[chapter]/page.tsx.
// Default to Matthew 5 (the Beatitudes) on first open. Prev/Next arrows
// step through chapters. Verses with commentary get a small accent dot;
// tap navigates to the commentary modal route.
//
// Scoped out of v1: book picker (no way to jump from Matthew → Genesis
// yet), translation picker, audio playback, highlighted-verse glow, search,
// last-read persistence. All coming in follow-up commits.

const DEFAULT_TRANSLATION = "kjva";
const DEFAULT_BOOK = "matthew";
const DEFAULT_CHAPTER = 5;

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

export default function BibleReaderScreen() {
  const api = getApi();
  const [translation] = useState(DEFAULT_TRANSLATION);
  const [bookSlug] = useState(DEFAULT_BOOK);
  const [chapterNumber, setChapterNumber] = useState(DEFAULT_CHAPTER);

  const chapterQuery = useQuery({
    queryKey: ["bible-chapter", translation, bookSlug, chapterNumber],
    queryFn: () => api.fetchBibleChapter(translation, bookSlug, chapterNumber),
    staleTime: 60 * 60 * 1000, // chapter text is effectively immutable
  });

  const catalogQuery = useQuery({
    queryKey: ["commentary-catalog"],
    queryFn: () => api.fetchCommentaryCatalog(),
    staleTime: 60 * 60 * 1000,
  });

  // Verse numbers in this chapter that have commentary, for the dot affordance.
  const versesWithCommentary = useMemo<Set<number>>(() => {
    const verses =
      catalogQuery.data?.index.byVerse[bookSlug]?.[String(chapterNumber)] ?? [];
    return new Set(verses);
  }, [catalogQuery.data, bookSlug, chapterNumber]);

  const onPrevChapter = () => {
    if (chapterNumber > 1) setChapterNumber(chapterNumber - 1);
  };
  const onNextChapter = () => {
    setChapterNumber(chapterNumber + 1);
  };
  const onVerseTap = (verseNumber: number) => {
    router.push(
      `/commentary/${bookSlug}/${chapterNumber}/${verseNumber}`,
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          onPress={onPrevChapter}
          disabled={chapterNumber <= 1}
          hitSlop={12}
          style={({ pressed }) => [
            styles.headerArrow,
            pressed && { opacity: 0.5 },
            chapterNumber <= 1 && { opacity: 0.3 },
          ]}
        >
          <Text style={styles.headerArrowGlyph}>‹</Text>
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerEyebrow}>{translation.toUpperCase()}</Text>
          <Text style={styles.headerTitle}>
            {bookLabel(bookSlug)} {chapterNumber}
          </Text>
        </View>

        <Pressable
          onPress={onNextChapter}
          hitSlop={12}
          style={({ pressed }) => [
            styles.headerArrow,
            pressed && { opacity: 0.5 },
          ]}
        >
          <Text style={styles.headerArrowGlyph}>›</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {chapterQuery.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : null}

        {chapterQuery.error ? (
          <View style={styles.errorCard}>
            <Text style={text.eyebrow}>Couldn't load chapter</Text>
            <Text style={[text.body, { color: colors.error }]}>
              {chapterQuery.error instanceof Error
                ? chapterQuery.error.message
                : String(chapterQuery.error)}
            </Text>
            <Pressable
              onPress={() => chapterQuery.refetch()}
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.retryLabel}>Try again</Text>
            </Pressable>
          </View>
        ) : null}

        {chapterQuery.data?.chapter.summary ? (
          <Text style={styles.chapterSummary}>
            {chapterQuery.data.chapter.summary}
          </Text>
        ) : null}

        {chapterQuery.data ? (
          <View style={styles.verseBlock}>
            {chapterQuery.data.verses.map((verse, index) => {
              const hasCommentary = versesWithCommentary.has(verse.verseNumber);
              const isFirstAfterParagraph =
                verse.paragraphStart === true ||
                index === 0 ||
                chapterQuery.data!.verses[index - 1]?.paragraphStart === true;

              return (
                <Pressable
                  key={verse.id}
                  onPress={hasCommentary ? () => onVerseTap(verse.verseNumber) : undefined}
                  style={({ pressed }) => [
                    styles.verseRow,
                    isFirstAfterParagraph && styles.verseRowParagraphStart,
                    pressed && hasCommentary && styles.verseRowPressed,
                  ]}
                  accessibilityLabel={`Verse ${verse.verseNumber}${hasCommentary ? ", tap for commentary" : ""}`}
                  accessibilityRole={hasCommentary ? "button" : "text"}
                >
                  <Text style={styles.verseInline}>
                    <Text style={styles.verseNumber}>
                      {verse.verseNumber}
                      {" "}
                    </Text>
                    <Text style={styles.verseText}>{verse.text}</Text>
                  </Text>
                  {hasCommentary ? <View style={styles.commentaryDot} /> : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <Text style={styles.tapHint}>
          Tap any verse with a gold dot to read the Fathers' commentary.
        </Text>
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
    backgroundColor: colors.background,
  },
  headerArrow: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerArrowGlyph: {
    fontSize: 28,
    color: colors.inkMuted,
    lineHeight: 28,
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerEyebrow: {
    fontSize: 9.5,
    fontWeight: "500",
    color: colors.inkSoft,
    letterSpacing: 2.4,
    marginBottom: 2,
  },
  headerTitle: {
    fontFamily: fonts.serif,
    fontSize: 20,
    color: colors.ink,
    letterSpacing: -0.3,
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing["4xl"],
    gap: spacing.lg,
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
  retryLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.accent,
    marginTop: spacing.xs,
  },

  chapterSummary: {
    fontSize: 13,
    lineHeight: 22,
    color: colors.inkSoft,
    fontStyle: "italic",
    borderLeftWidth: 2,
    borderLeftColor: "rgba(212, 168, 87, 0.4)",
    paddingLeft: spacing.md,
  },

  verseBlock: { gap: spacing.xs },
  verseRow: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  verseRowParagraphStart: {
    marginTop: spacing.md,
  },
  verseRowPressed: {
    backgroundColor: colors.accentSoft,
  },
  verseInline: {
    flex: 1,
  },
  verseNumber: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.accent,
    fontWeight: "500",
  },
  verseText: {
    fontFamily: fonts.serif,
    fontSize: 17,
    lineHeight: 28,
    color: colors.ink,
  },
  commentaryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginTop: 9,
  },

  tapHint: {
    fontSize: 11.5,
    color: colors.inkSoft,
    textAlign: "center",
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    fontStyle: "italic",
  },
});

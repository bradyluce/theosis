import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, fonts, radii, spacing, text } from "@/constants/theosis-theme";
import { getApi } from "@/lib/api";
import { getLastReadLocation, setLastReadLocation } from "@/lib/preferences";

// Bible reader — mobile port of src/app/(shell)/bible/[translation]/[book]/[chapter]/page.tsx.
//
// Driven by URL search params so Daily reading cards can deep-link with
// ?book=...&chapter=...&highlight=3-12. Defaults to KJVA Matthew 5 when no
// params are present (first-time open). Prev/Next arrows update params
// in-place via router.setParams; tab re-tap restores the previous params.
//
// Verses inside the `highlight` range get an accent-tinted background so
// the reader can scan to "today's appointed verses" at a glance. Full
// scroll-into-view animation is a follow-up.

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
  acts: "Acts",
};
function bookLabel(slug: string) {
  return (
    BOOK_LABELS[slug] ??
    slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

// Parse a "highlight" param like "3" or "3-12" into [start, end] or null.
function parseHighlight(raw: string | undefined): { start: number; end: number } | null {
  if (!raw) return null;
  const match = /^(\d+)(?:-(\d+))?$/.exec(raw);
  if (!match) return null;
  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : start;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return { start, end };
}

export default function BibleReaderScreen() {
  const api = getApi();
  const params = useLocalSearchParams<{
    translation?: string;
    book?: string;
    chapter?: string;
    highlight?: string;
  }>();

  const translation = params.translation || DEFAULT_TRANSLATION;
  const bookSlug = params.book || DEFAULT_BOOK;
  const chapterNumber = Number.parseInt(params.chapter ?? "", 10) || DEFAULT_CHAPTER;
  const highlight = parseHighlight(
    Array.isArray(params.highlight) ? params.highlight[0] : params.highlight,
  );

  // First-launch last-read restore. If the URL has no params (cold start
  // on this tab, no deep-linking from Daily), look up the persisted
  // location and replace params with it. `restored` gates the persist
  // effect below so we don't overwrite saved state with defaults during
  // the brief async window before AsyncStorage returns.
  const noParamsPresent = !params.translation && !params.book && !params.chapter;
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    if (!noParamsPresent) {
      setRestored(true);
      return;
    }
    let canceled = false;
    getLastReadLocation().then((loc) => {
      if (canceled) return;
      if (loc) {
        router.setParams({
          translation: loc.translation,
          book: loc.book,
          chapter: String(loc.chapter),
        });
      }
      setRestored(true);
    });
    return () => {
      canceled = true;
    };
  }, [noParamsPresent]);

  // Persist on every (translation, book, chapter) change. Skip until
  // restore completes to avoid clobbering saved state with defaults.
  useEffect(() => {
    if (!restored) return;
    setLastReadLocation({
      translation,
      book: bookSlug,
      chapter: chapterNumber,
    });
  }, [restored, translation, bookSlug, chapterNumber]);

  const chapterQuery = useQuery({
    queryKey: ["bible-chapter", translation, bookSlug, chapterNumber],
    queryFn: () => api.fetchBibleChapter(translation, bookSlug, chapterNumber),
    staleTime: 60 * 60 * 1000,
  });

  const catalogQuery = useQuery({
    queryKey: ["commentary-catalog"],
    queryFn: () => api.fetchCommentaryCatalog(),
    staleTime: 60 * 60 * 1000,
  });

  const versesWithCommentary = useMemo<Set<number>>(() => {
    const verses =
      catalogQuery.data?.index.byVerse[bookSlug]?.[String(chapterNumber)] ?? [];
    return new Set(verses);
  }, [catalogQuery.data, bookSlug, chapterNumber]);

  // Scroll-into-view + glow pulse for a highlighted verse. When the
  // reader loads from a Daily reading deep-link (?highlight=3-12), measure
  // the first highlighted verse's Y position and scroll it ~80px below
  // the top header. A one-shot Animated value (1 → 0 over 1.8s) drives a
  // background-color interpolation on the highlighted verses, mirroring
  // the .verse-glow keyframe in src/app/globals.css.
  const scrollRef = useRef<ScrollView>(null);
  const firstHighlightRef = useRef<View>(null);
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!highlight || !chapterQuery.data) return;
    glowAnim.setValue(1);
    Animated.timing(glowAnim, {
      toValue: 0,
      duration: 1800,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();

    // Small delay lets RN finish layout before we ask for measureLayout.
    const timer = setTimeout(() => {
      const scrollNode = scrollRef.current;
      const targetNode = firstHighlightRef.current;
      if (!scrollNode || !targetNode) return;
      targetNode.measureLayout(
        // measureLayout's first arg is the ancestor — we pass the ScrollView
        // ref directly; in modern RN this works without findNodeHandle.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        scrollNode as unknown as any,
        (_x: number, y: number) => {
          scrollNode.scrollTo({ y: Math.max(0, y - 80), animated: true });
        },
        () => {
          // measure failed (e.g. node unmounted mid-measure) — silent.
        },
      );
    }, 150);
    return () => clearTimeout(timer);
  }, [highlight?.start, highlight?.end, chapterQuery.data, glowAnim]);

  const glowBackground = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.accentSoft, "rgba(212, 168, 87, 0.32)"],
  });

  const onPrevChapter = () => {
    if (chapterNumber > 1) {
      router.setParams({
        translation,
        book: bookSlug,
        chapter: String(chapterNumber - 1),
        // Clear highlight when navigating away from the appointed chapter.
        highlight: "",
      });
    }
  };
  const onNextChapter = () => {
    router.setParams({
      translation,
      book: bookSlug,
      chapter: String(chapterNumber + 1),
      highlight: "",
    });
  };
  const onVerseTap = (verseNumber: number) => {
    router.push(`/commentary/${bookSlug}/${chapterNumber}/${verseNumber}`);
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

        <Pressable
          onPress={() =>
            router.push(`/book-picker?translation=${translation}`)
          }
          style={({ pressed }) => [
            styles.headerCenter,
            pressed && { opacity: 0.6 },
          ]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Choose a book"
        >
          <Text style={styles.headerEyebrow}>{translation.toUpperCase()}</Text>
          <Text style={styles.headerTitle}>
            {bookLabel(bookSlug)} {chapterNumber}
            <Text style={styles.headerTitleChevron}>  ▾</Text>
          </Text>
        </Pressable>

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
        ref={scrollRef}
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
              const isHighlighted =
                highlight !== null &&
                verse.verseNumber >= highlight.start &&
                verse.verseNumber <= highlight.end;
              const isFirstHighlight =
                isHighlighted && verse.verseNumber === highlight!.start;

              const inner = (
                <>
                  <Text style={styles.verseInline}>
                    <Text style={styles.verseNumber}>
                      {verse.verseNumber}
                      {" "}
                    </Text>
                    <Text style={styles.verseText}>{verse.text}</Text>
                  </Text>
                  {hasCommentary ? <View style={styles.commentaryDot} /> : null}
                </>
              );

              if (isHighlighted) {
                // Highlighted verses use Animated.View so the one-shot glow
                // pulse can interpolate the background color. The first
                // highlighted verse also carries the measure ref for
                // scroll-into-view.
                return (
                  <Animated.View
                    key={verse.id}
                    ref={isFirstHighlight ? firstHighlightRef : undefined}
                    style={[
                      styles.verseRow,
                      isFirstAfterParagraph && styles.verseRowParagraphStart,
                      styles.verseRowHighlight,
                      { backgroundColor: glowBackground },
                    ]}
                  >
                    <Pressable
                      onPress={
                        hasCommentary
                          ? () => onVerseTap(verse.verseNumber)
                          : undefined
                      }
                      style={({ pressed }) => [
                        styles.verseInnerPressable,
                        pressed && hasCommentary && { opacity: 0.7 },
                      ]}
                      accessibilityLabel={`Verse ${verse.verseNumber}${hasCommentary ? ", tap for commentary" : ""}, in today's appointed reading`}
                      accessibilityRole={hasCommentary ? "button" : "text"}
                    >
                      {inner}
                    </Pressable>
                  </Animated.View>
                );
              }

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
                  {inner}
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <Text style={styles.tapHint}>
          Tap any verse with a gold dot to read the Fathers&apos; commentary.
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
  headerTitleChevron: {
    fontSize: 11,
    color: colors.inkSoft,
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
  verseRowParagraphStart: { marginTop: spacing.md },
  verseRowPressed: { backgroundColor: colors.accentSoft },
  verseRowHighlight: {
    paddingHorizontal: spacing.md,
    // backgroundColor is applied dynamically via Animated.Value above so
    // the one-shot pulse can interpolate from highlight to accent-soft.
  },
  verseInnerPressable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  verseInline: { flex: 1 },
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

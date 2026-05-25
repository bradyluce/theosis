import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Feather from "@expo/vector-icons/Feather";

import { HIGHLIGHT_BY_SLUG } from "@/constants/highlight-colors";
import { colors, fonts, radii, spacing, text } from "@/constants/theosis-theme";
import { Eyebrow, GiltRule } from "@/components/theosis/primitives";
import { VerseActionsSheet } from "@/components/theosis/verse-actions-sheet";
import { getApi } from "@/lib/api";
import {
  type HighlightColor,
  type SavedVerse,
  addSavedVerse,
  getHighlights,
  getLastReadLocation,
  getSavedVerses,
  highlightKey,
  removeSavedVerse,
  setLastReadLocation,
  setVerseHighlight,
} from "@/lib/preferences";

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
  const bookSlug = params.book ?? null;
  const chapterNumber = params.chapter
    ? Number.parseInt(params.chapter, 10) || null
    : null;
  const highlight = parseHighlight(
    Array.isArray(params.highlight) ? params.highlight[0] : params.highlight,
  );

  // First-launch last-read restore. If the URL has no params (cold start
  // on this tab, no deep-linking from Daily), look up the persisted
  // location and replace params with it. If there's no saved location
  // either, we fall through to the empty-state view below, which prompts
  // the user to pick a book — rather than dropping them into Matthew 5.
  const noParamsPresent = !params.book && !params.chapter;
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
    if (!restored || !bookSlug || !chapterNumber) return;
    setLastReadLocation({
      translation,
      book: bookSlug,
      chapter: chapterNumber,
    });
  }, [restored, translation, bookSlug, chapterNumber]);

  const hasSelection = Boolean(bookSlug && chapterNumber);

  // First launch: once restore resolves and there's still no selection,
  // open the picker automatically so the user lands directly in the
  // "choose a book" experience instead of an empty screen.
  const [autoPushed, setAutoPushed] = useState(false);
  useEffect(() => {
    if (restored && !hasSelection && !autoPushed) {
      setAutoPushed(true);
      router.push(`/book-picker?translation=${translation}`);
    }
  }, [restored, hasSelection, autoPushed, translation]);

  const chapterQuery = useQuery({
    queryKey: ["bible-chapter", translation, bookSlug, chapterNumber],
    queryFn: () =>
      api.fetchBibleChapter(translation, bookSlug as string, chapterNumber as number),
    staleTime: 60 * 60 * 1000,
    enabled: hasSelection,
  });

  const catalogQuery = useQuery({
    queryKey: ["commentary-catalog"],
    queryFn: () => api.fetchCommentaryCatalog(),
    staleTime: 60 * 60 * 1000,
  });

  const versesWithCommentary = useMemo<Set<number>>(() => {
    if (!bookSlug || !chapterNumber) return new Set();
    const verses =
      catalogQuery.data?.index.byVerse[bookSlug]?.[String(chapterNumber)] ?? [];
    return new Set(verses);
  }, [catalogQuery.data, bookSlug, chapterNumber]);

  // Highlight color per verse-key — translation-agnostic so the same
  // marked verse glows across translations. Loaded once on mount and
  // updated optimistically when the user taps a color chip in the sheet.
  const [highlightMap, setHighlightMap] = useState<Map<string, HighlightColor>>(
    new Map(),
  );
  const [savedVerseIds, setSavedVerseIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let canceled = false;
    Promise.all([getHighlights(), getSavedVerses()]).then(([hs, saved]) => {
      if (canceled) return;
      setHighlightMap(new Map(hs.map((h) => [h.verseKey, h.color])));
      setSavedVerseIds(new Set(saved.map((v) => v.id)));
    });
    return () => {
      canceled = true;
    };
  }, []);

  // Active verse for the bottom-sheet actions. Null when the sheet is closed.
  const [activeVerse, setActiveVerse] = useState<{
    verseNumber: number;
    text: string;
  } | null>(null);

  const onSetHighlight = async (color: HighlightColor | null) => {
    if (!activeVerse || !bookSlug || !chapterNumber) return;
    const key = highlightKey(bookSlug, chapterNumber, activeVerse.verseNumber);
    // Optimistic update — sheet color chip + verse glow reflect immediately.
    setHighlightMap((prev) => {
      const next = new Map(prev);
      if (color) next.set(key, color);
      else next.delete(key);
      return next;
    });
    await setVerseHighlight(key, color);
  };

  const onToggleSave = async () => {
    if (!activeVerse || !bookSlug || !chapterNumber) return;
    const id = `${translation}:${bookSlug}.${chapterNumber}.${activeVerse.verseNumber}`;
    if (savedVerseIds.has(id)) {
      const next = await removeSavedVerse(id);
      setSavedVerseIds(new Set(next.map((v) => v.id)));
    } else {
      const verse: SavedVerse = {
        id,
        translation,
        book: bookSlug,
        chapter: chapterNumber,
        verse: activeVerse.verseNumber,
        preview: activeVerse.text,
        savedAt: new Date().toISOString(),
      };
      const next = await addSavedVerse(verse);
      setSavedVerseIds(new Set(next.map((v) => v.id)));
    }
  };

  // Scroll-into-view for highlighted verses. The first highlighted verse
  // is wrapped in an anchor View whose Y position the ScrollView uses to
  // For deep-linked highlights we need to scroll the first highlighted
  // verse into view. Since the verses render as one continuous prose
  // Text block (so spacing stays uniform above and below the highlight),
  // we can't get a per-verse Y position via refs. Instead we estimate
  // the target Y as (chars-before-first-highlight / total-chars) × the
  // prose container's measured height, plus the chapter display height.
  // It's approximate but lands within a screen of the right spot and
  // doesn't introduce a paragraph break in the prose.
  const scrollRef = useRef<ScrollView>(null);
  const [proseLayout, setProseLayout] = useState<{ y: number; h: number } | null>(
    null,
  );

  // Cumulative character count up to (but not including) the first
  // highlighted verse — and total character count of the chapter.
  const scrollMetrics = useMemo(() => {
    if (!highlight || !chapterQuery.data) return null;
    const verses = chapterQuery.data.verses;
    const firstIdx = verses.findIndex(
      (v) =>
        v.verseNumber >= highlight.start && v.verseNumber <= highlight.end,
    );
    if (firstIdx < 0) return null;
    let charsBefore = 0;
    let total = 0;
    for (let i = 0; i < verses.length; i++) {
      // +6 approximates the verse-number glyph + spaces per verse.
      const len = verses[i].text.length + 6;
      if (i < firstIdx) charsBefore += len;
      total += len;
    }
    return { ratio: total > 0 ? charsBefore / total : 0 };
  }, [highlight, chapterQuery.data]);

  useEffect(() => {
    if (!scrollMetrics || !proseLayout) return;
    const target = Math.max(
      0,
      proseLayout.y + scrollMetrics.ratio * proseLayout.h - 80,
    );
    const t = setTimeout(
      () => scrollRef.current?.scrollTo({ y: target, animated: true }),
      120,
    );
    return () => clearTimeout(t);
  }, [scrollMetrics, proseLayout]);

  const onPrevChapter = () => {
    if (!bookSlug || !chapterNumber) return;
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
    if (!bookSlug || !chapterNumber) return;
    router.setParams({
      translation,
      book: bookSlug,
      chapter: String(chapterNumber + 1),
      highlight: "",
    });
  };
  // Tapping any verse opens the actions sheet — highlight / save / copy /
  // commentary all live there. Commentary opens via the sheet's button
  // (so users who just want to save or copy aren't forced through the
  // commentary modal).
  const onVerseTap = (verse: { verseNumber: number; text: string }) => {
    setActiveVerse(verse);
  };

  // Empty state — no book selected. Editorial invitation rather than a
  // bald "tap to choose" — the page reads like the inside cover of a
  // leather-bound book.
  if (restored && !hasSelection) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.emptyWrap}>
          <Eyebrow tone="accent">The Holy Scriptures</Eyebrow>
          <Text style={styles.emptyTitle}>
            Choose a book{"\n"}to begin
          </Text>
          <GiltRule style={{ marginTop: spacing.lg }} />
          <Text style={styles.emptyBody}>
            The Old and New Testaments, with the Orthodox deuterocanonical
            books in their canonical place — KJVA, RSV, the Septuagint, and
            the Greek New Testament.
          </Text>
          <Pressable
            onPress={() =>
              router.push(`/book-picker?translation=${translation}`)
            }
            style={({ pressed }) => [
              styles.emptyButton,
              pressed && { opacity: 0.85 },
            ]}
            accessibilityRole="button"
          >
            <Text style={styles.emptyButtonLabel}>Browse the canon</Text>
            <Feather name="arrow-right" size={14} color={colors.accent} />
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Reader header — translation eyebrow + book name + chapter chevrons.
          The center is tappable to open the picker. */}
      <View style={styles.header}>
        <Pressable
          onPress={onPrevChapter}
          disabled={!chapterNumber || chapterNumber <= 1}
          hitSlop={12}
          style={({ pressed }) => [
            styles.headerArrow,
            pressed && { opacity: 0.5 },
            (!chapterNumber || chapterNumber <= 1) && { opacity: 0.3 },
          ]}
        >
          <Feather name="chevron-left" size={22} color={colors.inkMuted} />
        </Pressable>

        <Pressable
          onPress={() =>
            router.push(`/book-picker?translation=${translation}`)
          }
          style={({ pressed }) => [
            styles.headerCenter,
            pressed && { opacity: 0.7 },
          ]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Choose a book"
        >
          <Text style={styles.headerEyebrow}>{translation.toUpperCase()}</Text>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>
              {bookSlug ? bookLabel(bookSlug) : ""} {chapterNumber ?? ""}
            </Text>
            <Feather name="chevron-down" size={12} color={colors.inkSoft} />
          </View>
        </Pressable>

        <Pressable
          onPress={onNextChapter}
          hitSlop={12}
          style={({ pressed }) => [
            styles.headerArrow,
            pressed && { opacity: 0.5 },
          ]}
        >
          <Feather name="chevron-right" size={22} color={colors.inkMuted} />
        </Pressable>
      </View>
      <GiltRule full style={{ marginHorizontal: spacing.xl }} />

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

        {chapterQuery.data ? (() => {
          const verses = chapterQuery.data.verses;

          // Chapter display block — page-corner numeral with the book name
          // beneath. Reads like the headpiece of an illuminated manuscript.
          const chapterDisplay = (
            <View style={styles.chapterDisplay}>
              <View style={styles.chapterDisplayLeft}>
                <Eyebrow tone="soft">Chapter</Eyebrow>
                <Text style={styles.chapterBookLabel}>
                  {bookSlug ? bookLabel(bookSlug) : ""}
                </Text>
                <GiltRule style={{ marginTop: spacing.sm }} />
              </View>
              <Text style={styles.chapterNumeral}>{chapterNumber}</Text>
            </View>
          );

          const renderVerse = (verse: typeof verses[number]) => {
            const hasCommentary = versesWithCommentary.has(verse.verseNumber);
            // Deep-link highlight (today's appointed reading) — distinct from
            // user-saved color highlights below. Both can coexist on the same
            // verse; the deep-link style wins visually when active.
            const isAppointedHighlight =
              highlight !== null &&
              verse.verseNumber >= highlight.start &&
              verse.verseNumber <= highlight.end;
            const userHighlightColor =
              bookSlug && chapterNumber
                ? highlightMap.get(
                    highlightKey(bookSlug, chapterNumber, verse.verseNumber),
                  )
                : undefined;
            const userTint = userHighlightColor
              ? HIGHLIGHT_BY_SLUG.get(userHighlightColor)?.tint
              : undefined;

            const verseStyle = isAppointedHighlight
              ? styles.verseHighlight
              : userTint
                ? { backgroundColor: userTint }
                : undefined;

            // Drop cap on verse 1 — oxblood illuminated initial. Floats
            // visually because the line-height pulls the cap up and the
            // ascender extends naturally over the following text.
            const isFirstVerse = verse.verseNumber === 1;
            if (isFirstVerse) {
              const firstChar = verse.text.charAt(0);
              const rest = verse.text.slice(1);
              return (
                <Text
                  key={verse.id}
                  onPress={() =>
                    onVerseTap({
                      verseNumber: verse.verseNumber,
                      text: verse.text,
                    })
                  }
                  style={verseStyle}
                  accessibilityRole="button"
                  accessibilityLabel={`Verse 1${hasCommentary ? ", commentary available" : ""}`}
                >
                  <Text style={styles.dropCap}>{firstChar}</Text>
                  <Text style={styles.verseText}>{rest} </Text>
                </Text>
              );
            }

            return (
              <Text
                key={verse.id}
                onPress={() =>
                  onVerseTap({
                    verseNumber: verse.verseNumber,
                    text: verse.text,
                  })
                }
                style={verseStyle}
                accessibilityRole="button"
                accessibilityLabel={`Verse ${verse.verseNumber}${hasCommentary ? ", commentary available" : ""}${userHighlightColor ? `, highlighted ${userHighlightColor}` : ""}`}
              >
                <Text style={styles.verseNumber}>{verse.verseNumber}</Text>
                <Text style={styles.verseText}> {verse.text} </Text>
              </Text>
            );
          };

          return (
            <>
              {chapterDisplay}
              {/* One continuous prose Text — verses above and below the
                  highlight share identical line-height. onLayout captures
                  the prose's screen position so the deep-link scroll effect
                  can land near the highlighted range. */}
              <Text
                style={styles.verseProse}
                onLayout={(e) =>
                  setProseLayout({
                    y: e.nativeEvent.layout.y,
                    h: e.nativeEvent.layout.height,
                  })
                }
              >
                {verses.map(renderVerse)}
              </Text>
            </>
          );
        })() : null}
      </ScrollView>

      <VerseActionsSheet
        visible={activeVerse !== null}
        onClose={() => setActiveVerse(null)}
        verse={
          activeVerse && bookSlug && chapterNumber
            ? {
                bookSlug,
                bookLabel: bookLabel(bookSlug),
                chapter: chapterNumber,
                verseNumber: activeVerse.verseNumber,
                text: activeVerse.text,
                translation,
              }
            : null
        }
        hasCommentary={
          activeVerse ? versesWithCommentary.has(activeVerse.verseNumber) : false
        }
        isSaved={
          activeVerse && bookSlug && chapterNumber
            ? savedVerseIds.has(
                `${translation}:${bookSlug}.${chapterNumber}.${activeVerse.verseNumber}`,
              )
            : false
        }
        currentHighlight={
          activeVerse && bookSlug && chapterNumber
            ? highlightMap.get(
                highlightKey(bookSlug, chapterNumber, activeVerse.verseNumber),
              ) ?? null
            : null
        }
        onToggleSave={onToggleSave}
        onSetHighlight={onSetHighlight}
      />
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
    backgroundColor: colors.background,
  },
  headerArrow: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { flex: 1, alignItems: "center", gap: 2 },
  headerEyebrow: {
    fontFamily: fonts.sans,
    fontSize: 9.5,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 2.6,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  headerTitle: {
    fontFamily: fonts.serif,
    fontSize: 20,
    color: colors.ink,
    letterSpacing: -0.3,
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing["6xl"] + spacing["3xl"],
    gap: spacing.lg,
  },

  // Chapter display block — sits above the prose with the book name on
  // the left and a massive italic numeral on the right, like the opening
  // page of an illuminated codex.
  chapterDisplay: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  chapterDisplayLeft: { flex: 1, gap: spacing.xs },
  chapterBookLabel: {
    fontFamily: fonts.serif,
    fontSize: 26,
    color: colors.ink,
    letterSpacing: -0.4,
    lineHeight: 30,
  },
  chapterNumeral: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 96,
    lineHeight: 96,
    color: colors.accent,
    opacity: 0.92,
    letterSpacing: -4,
    // The italic ascender naturally extends slightly above the baseline;
    // negative margin pulls it back to align with the book label cap line.
    marginTop: -spacing.lg,
    marginRight: -spacing.xs,
  },

  // Drop cap — oxblood illuminated initial on verse 1. The font size +
  // negative letter spacing make it look hand-set on the page.
  dropCap: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 60,
    lineHeight: 54,
    color: colors.oxbloodInk,
    letterSpacing: -2,
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

  verseProse: {
    fontFamily: fonts.serif,
    fontSize: 18,
    lineHeight: 32,
    color: colors.ink,
  },
  verseNumber: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.accent,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  verseText: {
    fontFamily: fonts.serif,
    fontSize: 18,
    lineHeight: 32,
    color: colors.ink,
  },
  verseHighlight: {
    backgroundColor: colors.accentSoft,
  },

  emptyWrap: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing["4xl"],
    gap: spacing.md,
  },
  emptyTitle: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 44,
    color: colors.ink,
    letterSpacing: -0.6,
    lineHeight: 48,
    marginTop: spacing.sm,
  },
  emptyBody: {
    fontFamily: fonts.serif,
    fontSize: 15,
    lineHeight: 26,
    color: colors.inkMuted,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  emptyButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: "rgba(212, 168, 87, 0.10)",
    borderWidth: 1,
    borderColor: colors.lineGilt,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  emptyButtonLabel: {
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
});

import Feather from "@expo/vector-icons/Feather";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Eyebrow, GiltRule } from "@/components/theosis/primitives";
import { ParagraphActionsSheet } from "@/components/theosis/paragraph-actions-sheet";
import { HIGHLIGHT_BY_SLUG } from "@/constants/highlight-colors";
import { colors, fonts, radii, spacing, text } from "@/constants/theosis-theme";
import { getApi } from "@/lib/api";
import {
  addCompletion,
  getProfilePrefs,
  getWorkHighlightsFor,
  getWorkPosition,
  isCompleted,
  isWorkChapterSaved,
  removeCompletion,
  setWorkParagraphHighlight,
  setWorkPosition,
  textSizeScale,
  toggleSavedWorkChapter,
  type HighlightColor,
  type ProfilePrefs,
} from "@/lib/preferences";

// Chapter reader — the full-screen prose page. Editorial treatment:
// kicker eyebrow with the chapter label, italic display heading with
// the chapter title, optional pull-quote summary, drop cap on the
// first paragraph of the first section. Mirrors the Bible reader's
// typographic gravitas so reading the Fathers feels of-a-piece with
// reading Scripture.

export default function ChapterReaderScreen() {
  const params = useLocalSearchParams<{ work: string; order: string }>();
  const workId = params.work;
  const order = Number.parseInt(params.order ?? "", 10);

  const api = getApi();
  const chapterQuery = useQuery({
    queryKey: ["work-chapter", workId, order],
    queryFn: () => api.fetchWorkChapter(workId, order),
    enabled: Boolean(workId) && Number.isFinite(order),
    staleTime: 60 * 60 * 1000,
  });
  // Fetch the library catalog so we can resolve the work title for
  // Save Chapter (the saved-list display needs more than the slug).
  // Cached for an hour — usually already in cache from the works list.
  const libraryQuery = useQuery({
    queryKey: ["library-catalog"],
    queryFn: () => api.fetchLibraryCatalog(),
    staleTime: 60 * 60 * 1000,
  });
  const workTitle = useMemo(() => {
    const work = libraryQuery.data?.works.find((w) => w.id === workId);
    return work?.shortTitle ?? work?.title ?? workId;
  }, [libraryQuery.data, workId]);

  // Composite slug for the completion mark — work + chapter order
  // uniquely identifies a chapter inside the corpus.
  const completionSlug = `${workId}::${order}`;
  const [completed, setCompleted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [textSize, setTextSize] = useState<ProfilePrefs["textSize"]>("md");

  // Save-chapter state + per-paragraph highlight map.
  const [chapterSaved, setChapterSaved] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [paragraphHighlights, setParagraphHighlights] = useState<
    Map<string, HighlightColor>
  >(new Map());
  const [activeParagraph, setActiveParagraph] = useState<{
    sectionIdx: number;
    paragraphIdx: number;
    text: string;
  } | null>(null);

  useFocusEffect(
    useCallback(() => {
      let canceled = false;
      Promise.all([
        isCompleted("work-chapter", completionSlug),
        getProfilePrefs(),
        isWorkChapterSaved(workId, order),
        getWorkHighlightsFor(workId, order),
      ]).then(([isDone, p, isSavedNow, highlightMap]) => {
        if (canceled) return;
        setCompleted(isDone);
        setTextSize(p.textSize ?? "md");
        setChapterSaved(isSavedNow);
        setParagraphHighlights(highlightMap);
      });
      return () => {
        canceled = true;
      };
    }, [completionSlug, workId, order]),
  );

  async function toggleCompleted() {
    if (busy) return;
    setBusy(true);
    try {
      if (completed) {
        await removeCompletion("work-chapter", completionSlug);
        setCompleted(false);
      } else {
        await addCompletion("work-chapter", completionSlug);
        setCompleted(true);
      }
    } finally {
      setBusy(false);
    }
  }

  // Save / unsave the whole chapter. Chapters live as their own
  // bookmarks (distinct from "marked as read") so a user can keep a
  // pile of chapters they intend to return to without claiming
  // they've finished them.
  async function toggleSavedChapter() {
    if (saveBusy || !chapterQuery.data) return;
    setSaveBusy(true);
    try {
      const result = await toggleSavedWorkChapter({
        workId,
        order,
        workTitle,
        chapterLabel: chapterQuery.data.chapter.label,
      });
      setChapterSaved(result.saved);
    } finally {
      setSaveBusy(false);
    }
  }

  // Apply a highlight color to the currently-active paragraph (the
  // one whose action sheet is open). null clears the highlight.
  async function applyParagraphHighlight(color: HighlightColor | null) {
    if (!activeParagraph) return;
    const key = `${activeParagraph.sectionIdx}::${activeParagraph.paragraphIdx}`;
    setParagraphHighlights((prev) => {
      const next = new Map(prev);
      if (color) next.set(key, color);
      else next.delete(key);
      return next;
    });
    await setWorkParagraphHighlight({
      workId,
      order,
      sectionIdx: activeParagraph.sectionIdx,
      paragraphIdx: activeParagraph.paragraphIdx,
      color,
      excerpt: color ? activeParagraph.text.slice(0, 140) : undefined,
    });
  }

  // Scale paragraph and section-heading fontSizes to honor the user's
  // textSize preference — the same multiplier used in the Bible reader
  // so prose feels consistent across the app.
  const scale = textSizeScale(textSize);
  const scaledParagraph = useMemo(
    () => ({ fontSize: 18 * scale, lineHeight: 32 * scale }),
    [scale],
  );
  const scaledSectionHeading = useMemo(
    () => ({ fontSize: 20 * scale, lineHeight: 26 * scale }),
    [scale],
  );

  // Scroll restoration. When the user returns to a chapter they've
  // already started, we jump them to the last saved scroll position
  // instead of the top. The position is debounced-written on every
  // scroll event so we don't thrash AsyncStorage.
  const scrollRef = useRef<ScrollView>(null);
  const lastWrittenRef = useRef<number>(0);
  const writeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track whether we've already attempted the restore — once, after
  // the data loads. Otherwise we'd fight the user's manual scrolls.
  const [pendingRestore, setPendingRestore] = useState<number | null>(null);
  const [restored, setRestored] = useState(false);

  // Load the saved position when the chapter ID changes. The actual
  // scrollTo runs in a separate effect tied to chapter data being
  // ready, so the ScrollView has rendered its content first.
  useEffect(() => {
    let canceled = false;
    setRestored(false);
    void getWorkPosition(workId, order).then((pos) => {
      if (canceled) return;
      // Tiny scroll positions aren't worth restoring; treat them as
      // "start at the top" so the chapter title page is always
      // visible on a quick second visit.
      if (pos && pos.scrollY > 80) {
        setPendingRestore(pos.scrollY);
      } else {
        setPendingRestore(null);
      }
    });
    return () => {
      canceled = true;
    };
  }, [workId, order]);

  // Once the chapter data is in and we have a pending restore Y,
  // scroll there. Setting restored:true prevents re-firing if the
  // chapter data refetches.
  useEffect(() => {
    if (restored) return;
    if (!chapterQuery.data) return;
    if (pendingRestore === null) {
      setRestored(true);
      return;
    }
    // Defer one frame so the ScrollView has measured its content.
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: pendingRestore, animated: false });
      setRestored(true);
    }, 60);
    return () => clearTimeout(t);
  }, [chapterQuery.data, pendingRestore, restored]);

  // Track the latest scroll Y so we can flush it on blur even if the
  // debounce timer hasn't fired yet. Plain ref — no re-renders.
  const currentYRef = useRef<number>(0);

  // Debounced scroll-position writer. 450ms after the user stops
  // scrolling, we commit the y to AsyncStorage. We skip writes that
  // are within 16px of the previous one to avoid recording every
  // tiny pixel shift.
  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      currentYRef.current = y;
      if (Math.abs(y - lastWrittenRef.current) < 16) return;
      if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
      writeTimerRef.current = setTimeout(() => {
        lastWrittenRef.current = y;
        void setWorkPosition(workId, order, y);
      }, 450);
    },
    [workId, order],
  );

  // Flush on blur. The old version just cleared the timer; if the
  // user scrolled and immediately tapped back, the 450ms timer never
  // fired and the position was lost. Now we ALSO commit the most
  // recent Y from currentYRef before the timer dies.
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (writeTimerRef.current) {
          clearTimeout(writeTimerRef.current);
          writeTimerRef.current = null;
        }
        const y = currentYRef.current;
        // setWorkPosition itself drops anything under ~4px as "top".
        // Re-check the 16px change threshold so we don't bloat the
        // store with no-op writes.
        if (Math.abs(y - lastWrittenRef.current) >= 16) {
          lastWrittenRef.current = y;
          void setWorkPosition(workId, order, y);
        }
      };
    }, [workId, order]),
  );

  // Belt-and-suspenders: on full unmount also clear any lingering timer.
  useEffect(() => {
    return () => {
      if (writeTimerRef.current) {
        clearTimeout(writeTimerRef.current);
      }
    };
  }, []);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "",
          headerBackTitle: "Contents",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.accent,
          headerShadowVisible: false,
          headerTransparent: false,
        }}
      />
      <View style={styles.root}>
        <LinearGradient
          colors={[
            "rgba(212, 168, 87, 0.08)",
            "transparent",
            colors.background,
          ]}
          locations={[0, 0.3, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={120}
        >
          {chapterQuery.isLoading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : null}

          {chapterQuery.error ? (
            <View style={styles.errorCard}>
              <Eyebrow tone="oxblood">Couldn&apos;t load chapter</Eyebrow>
              <Text style={[text.body, { color: colors.error, marginTop: spacing.sm }]}>
                {chapterQuery.error instanceof Error
                  ? chapterQuery.error.message
                  : String(chapterQuery.error)}
              </Text>
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => [pressed && { opacity: 0.6 }]}
              >
                <Text style={styles.backLink}>← Back</Text>
              </Pressable>
            </View>
          ) : null}

          {chapterQuery.data ? (
            <>
              {/* Title page for the chapter — small kicker label + big
                  italic chapter title + optional pull-quote summary. */}
              <View style={styles.titleBlock}>
                <Eyebrow tone="accent">
                  {chapterQuery.data.chapter.label}
                </Eyebrow>
                <Text style={styles.title}>
                  {chapterQuery.data.chapter.title}
                </Text>
                <GiltRule style={{ marginTop: spacing.md }} />
              </View>

              {chapterQuery.data.chapter.summary ? (
                <Text style={styles.chapterSummary}>
                  {chapterQuery.data.chapter.summary}
                </Text>
              ) : null}

              {chapterQuery.data.chapter.sections.map((section, sectionIdx) => (
                <View key={`section-${sectionIdx}`} style={styles.section}>
                  {section.heading ? (
                    <Text style={[styles.sectionHeading, scaledSectionHeading]}>
                      {section.heading}
                    </Text>
                  ) : null}
                  {section.paragraphs.map((paragraph, pIdx) => {
                    const isFirstParagraph = sectionIdx === 0 && pIdx === 0;
                    const hlKey = `${sectionIdx}::${pIdx}`;
                    const hlColor = paragraphHighlights.get(hlKey);
                    const tint = hlColor
                      ? HIGHLIGHT_BY_SLUG.get(hlColor)?.tint
                      : undefined;
                    const onPressParagraph = () =>
                      setActiveParagraph({
                        sectionIdx,
                        paragraphIdx: pIdx,
                        text: paragraph.text,
                      });
                    // Drop cap on the very first paragraph of the
                    // chapter — oxblood illuminated initial, mirrors the
                    // Bible reader's verse-1 treatment.
                    if (isFirstParagraph && paragraph.text.length > 0) {
                      const firstChar = paragraph.text.charAt(0);
                      const rest = paragraph.text.slice(1);
                      return (
                        <Text
                          key={`p-${sectionIdx}-${pIdx}`}
                          onPress={onPressParagraph}
                          style={[
                            styles.paragraph,
                            scaledParagraph,
                            tint ? { backgroundColor: tint } : null,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel="Paragraph — tap to highlight, copy, or note"
                        >
                          {paragraph.number !== undefined ? (
                            <Text style={styles.paragraphNumber}>
                              {paragraph.number}
                              {" "}
                            </Text>
                          ) : null}
                          <Text style={styles.dropCap}>{firstChar}</Text>
                          <Text>{rest}</Text>
                        </Text>
                      );
                    }
                    return (
                      <Text
                        key={`p-${sectionIdx}-${pIdx}`}
                        onPress={onPressParagraph}
                        style={[
                          styles.paragraph,
                          scaledParagraph,
                          tint ? { backgroundColor: tint } : null,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Paragraph — tap to highlight, copy, or note"
                      >
                        {paragraph.number !== undefined ? (
                          <Text style={styles.paragraphNumber}>
                            {paragraph.number}
                            {" "}
                          </Text>
                        ) : null}
                        {paragraph.text}
                      </Text>
                    );
                  })}
                </View>
              ))}

              {/* Chapter actions — Mark as read + Save chapter side by
                  side. Mark-as-read is the gilt-pill emphasis; Save is
                  a quieter outline pill so it doesn't compete. Both
                  reflect state loaded on focus. */}
              <View style={styles.chapterActionsBlock}>
                <Pressable
                  onPress={toggleCompleted}
                  disabled={busy}
                  style={({ pressed }) => [
                    styles.markReadButton,
                    completed && styles.markReadButtonDone,
                    busy && { opacity: 0.5 },
                    pressed && { opacity: 0.85 },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: completed }}
                  accessibilityLabel={
                    completed
                      ? "Unmark this chapter as read"
                      : "Mark this chapter as read"
                  }
                >
                  <Feather
                    name="check"
                    size={15}
                    color={completed ? colors.background : colors.accent}
                  />
                  <Text
                    style={[
                      styles.markReadLabel,
                      completed && styles.markReadLabelDone,
                    ]}
                  >
                    {completed ? "Read · tap to unmark" : "Mark as read"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={toggleSavedChapter}
                  disabled={saveBusy}
                  style={({ pressed }) => [
                    styles.saveChapterButton,
                    chapterSaved && styles.saveChapterButtonSaved,
                    saveBusy && { opacity: 0.5 },
                    pressed && { opacity: 0.85 },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: chapterSaved }}
                  accessibilityLabel={
                    chapterSaved
                      ? "Remove chapter from saved"
                      : "Save chapter"
                  }
                >
                  <Feather
                    name="bookmark"
                    size={15}
                    color={chapterSaved ? colors.accent : colors.inkMuted}
                  />
                  <Text
                    style={[
                      styles.saveChapterLabel,
                      chapterSaved && styles.saveChapterLabelSaved,
                    ]}
                  >
                    {chapterSaved ? "Saved" : "Save chapter"}
                  </Text>
                </Pressable>
              </View>

              {/* Colophon — gilt rule + "End of <label>" in italic small caps */}
              <View style={styles.colophon}>
                <GiltRule />
                <Text style={styles.colophonText}>
                  End of {chapterQuery.data.chapter.label}
                </Text>
              </View>
            </>
          ) : null}
        </ScrollView>
      </View>

      {/* Paragraph actions sheet — appears when a paragraph is
          tapped. Provides the 5-color highlight picker, copy, and a
          Note shortcut. */}
      <ParagraphActionsSheet
        visible={activeParagraph !== null}
        onClose={() => setActiveParagraph(null)}
        paragraph={
          activeParagraph && chapterQuery.data
            ? {
                workId,
                order,
                sectionIdx: activeParagraph.sectionIdx,
                paragraphIdx: activeParagraph.paragraphIdx,
                text: activeParagraph.text,
                chapterLabel: chapterQuery.data.chapter.label,
              }
            : null
        }
        currentHighlight={
          activeParagraph
            ? paragraphHighlights.get(
                `${activeParagraph.sectionIdx}::${activeParagraph.paragraphIdx}`,
              ) ?? null
            : null
        }
        onSetHighlight={applyParagraphHighlight}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing["4xl"] + spacing["2xl"],
    gap: spacing.lg,
  },

  loading: { paddingVertical: spacing["4xl"], alignItems: "center" },
  errorCard: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  backLink: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.accent,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginTop: spacing.sm,
  },

  // Chapter title page
  titleBlock: { gap: spacing.xs, paddingBottom: spacing.sm },
  title: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 30,
    color: colors.ink,
    letterSpacing: -0.4,
    lineHeight: 36,
    marginTop: spacing.xs,
  },

  // Pull-quote summary — italic with a left gilt rule (printed-book feel)
  chapterSummary: {
    fontFamily: fonts.serifItalic,
    fontSize: 16,
    lineHeight: 26,
    color: colors.inkMuted,
    borderLeftWidth: 2,
    borderLeftColor: colors.lineGilt,
    paddingLeft: spacing.md,
  },

  section: {
    gap: spacing.md,
    // Generous top padding so the drop cap on the first paragraph
    // can never crash into a section heading above. Was spacing.sm
    // (~8px); bumped to spacing.lg so the descender of the heading
    // and the ascender of the oxblood drop cap have visible breathing
    // room.
    paddingTop: spacing.lg,
  },
  sectionHeading: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 20,
    color: colors.accent,
    letterSpacing: -0.3,
    // Generous lineHeight so the heading has its own clear band, with
    // a comfortable gap below before the drop cap begins.
    lineHeight: 30,
    marginBottom: spacing.xs,
  },
  paragraph: {
    fontFamily: fonts.serif,
    fontSize: 18,
    lineHeight: 32,
    color: colors.ink,
  },
  paragraphNumber: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.accent,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  // Drop cap — oxblood illuminated initial on the opening paragraph.
  // lineHeight must be >= fontSize so the glyph never overflows
  // upward into the section heading above. Was 50 with fontSize 56,
  // which caused the character ascender to overlap whatever sat
  // above.
  dropCap: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 54,
    lineHeight: 58,
    color: colors.oxbloodInk,
    letterSpacing: -2,
  },

  // Chapter actions — gilt pill for Mark as read, outline pill for
  // Save chapter. Sit side-by-side at the bottom of the chapter.
  chapterActionsBlock: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingTop: spacing.xl,
  },
  markReadButton: {
    flex: 1,
    minWidth: 180,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: "rgba(212, 168, 87, 0.55)",
    backgroundColor: colors.accentSoft,
  },
  saveChapterButton: {
    flex: 1,
    minWidth: 140,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  saveChapterButtonSaved: {
    borderColor: "rgba(212, 168, 87, 0.55)",
    backgroundColor: colors.accentSoft,
  },
  saveChapterLabel: {
    fontFamily: fonts.serif,
    fontSize: 14,
    color: colors.inkMuted,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  saveChapterLabelSaved: { color: colors.accent },
  markReadButtonDone: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  markReadLabel: {
    fontFamily: fonts.serif,
    fontSize: 14,
    color: colors.accent,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  markReadLabelDone: { color: colors.background },

  // Colophon at the end of the chapter
  colophon: {
    paddingTop: spacing["2xl"],
    alignItems: "center",
    gap: spacing.md,
  },
  colophonText: {
    fontFamily: fonts.sans,
    fontSize: 10.5,
    fontWeight: "600",
    color: colors.inkSoft,
    letterSpacing: 2.4,
    textTransform: "uppercase",
  },
});

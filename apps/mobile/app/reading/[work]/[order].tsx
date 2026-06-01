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

// --- Liturgy speaker voices ------------------------------------------------
// The early-liturgy works (St. James, St. Mark, the Liturgy of the Blessed
// Apostles) carry their rubrics as short italic paragraphs — "The Priest.",
// "The Deacon.", "The People." — followed by the spoken/sung text. We don't
// store a speaker on each spoken line, so we derive it at render time: a
// rubric that names a voice sets the "current speaker," and every line after
// it inherits that voice until the next naming rubric. Priest reads bold,
// Deacon italic, People (and Singers/Readers) regular.
type SpeakerRole = "priest" | "deacon" | "people" | null;

// Pull the speaker out of a rubric's text. Rubrics that don't name anyone
// ("(Aloud.)", "Prayer of the veil.", "And again.") return null, which leaves
// the current voice unchanged — the priest keeps speaking through his prayer.
function speakerFromRubric(rubricText: string): SpeakerRole {
  const t = rubricText.toLowerCase();
  if (t.includes("priest") || t.includes("bishop")) return "priest";
  if (t.includes("deacon")) return "deacon"; // also sub-deacon, archdeacon
  if (t.includes("people")) return "people";
  if (/\b(singer|reader|choir|chanter)/.test(t)) return "people";
  return null;
}

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
  // Rubrics (stage directions) sit a touch smaller than the spoken body.
  const scaledRubric = useMemo(
    () => ({ fontSize: 14 * scale, lineHeight: 22 * scale }),
    [scale],
  );

  // Liturgy works style their paragraphs by speaker; everything else renders
  // as plain prose. Detected by the `liturgy-` work-id prefix (James, Mark,
  // Apostles today; the canonical Chrysostom/Basil/Presanctified later). The
  // memo walks the chapter once, threading the current speaker forward, and
  // returns a per-paragraph voice map. null for non-liturgy works leaves the
  // prose path below completely unchanged.
  const isLiturgy = typeof workId === "string" && workId.startsWith("liturgy-");
  const liturgyRoles = useMemo(() => {
    if (!isLiturgy || !chapterQuery.data) return null;
    const roles = new Map<string, { isRubric: boolean; role: SpeakerRole }>();
    let current: SpeakerRole = null;
    chapterQuery.data.chapter.sections.forEach((section, sIdx) => {
      section.paragraphs.forEach((paragraph, pIdx) => {
        const isRubric = Boolean(paragraph.html);
        if (isRubric) {
          const named = speakerFromRubric(paragraph.text);
          if (named) current = named;
        }
        roles.set(`${sIdx}::${pIdx}`, { isRubric, role: current });
      });
    });
    return roles;
  }, [isLiturgy, chapterQuery.data]);

  // Scroll restoration. When the user returns to a chapter they've
  // already started, we jump them to the last saved scroll position
  // instead of the top.
  //
  // V2 changes after v1 unreliability:
  //   - Throttled writer (250ms minimum interval) instead of debounce
  //     so the position is captured even on quick exits.
  //   - onContentSizeChange-driven restore so the scrollTo waits for
  //     content to actually be tall enough.
  //   - Three retry attempts (60/300/800ms) as belt-and-suspenders
  //     against any late layout shift.
  const scrollRef = useRef<ScrollView>(null);
  const lastWrittenRef = useRef<number>(0);
  const lastWriteTimeRef = useRef<number>(0);
  const [pendingRestore, setPendingRestore] = useState<number | null>(null);
  const [restored, setRestored] = useState(false);

  // Load the saved position when the chapter ID changes.
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

  // Restore via multiple retries. The 60ms initial attempt sometimes
  // raced React's first layout pass, so the scrollTo silently clamped
  // to the smaller content size. Three attempts at increasing delays
  // catch the layout as the prose paragraphs measure and re-measure.
  useEffect(() => {
    if (restored) return;
    if (!chapterQuery.data) return;
    if (pendingRestore === null) {
      setRestored(true);
      return;
    }
    const target = pendingRestore;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const delay of [60, 300, 800]) {
      timers.push(
        setTimeout(() => {
          scrollRef.current?.scrollTo({ y: target, animated: false });
        }, delay),
      );
    }
    timers.push(
      setTimeout(() => {
        setRestored(true);
      }, 900),
    );
    return () => timers.forEach(clearTimeout);
  }, [chapterQuery.data, pendingRestore, restored]);

  // Also try once when ScrollView reports its content size changed —
  // catches the case where chapterQuery.data was cached and content
  // is large enough on second visit BEFORE the timers fire.
  const handleContentSizeChange = useCallback(
    (_width: number, height: number) => {
      if (restored) return;
      if (pendingRestore === null) return;
      if (height < pendingRestore + 100) return;
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y: pendingRestore, animated: false });
      });
    },
    [restored, pendingRestore],
  );

  // Track the latest scroll Y so we can flush it on blur.
  const currentYRef = useRef<number>(0);

  // Throttled scroll-position writer. Every meaningful scroll change
  // (>=16px) commits to AsyncStorage at most 4 times per second.
  // Switched from debounce → throttle because debounce never fired
  // when the user scrolled-then-immediately-tapped-back: the 450ms
  // timer was cleared on unmount before it could write.
  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      currentYRef.current = y;
      if (Math.abs(y - lastWrittenRef.current) < 16) return;
      const now = Date.now();
      if (now - lastWriteTimeRef.current < 250) return;
      lastWriteTimeRef.current = now;
      lastWrittenRef.current = y;
      void setWorkPosition(workId, order, y);
    },
    [workId, order],
  );

  // Flush on blur as a final guarantee. Captures the very last scroll
  // position even if it didn't pass the 250ms throttle gate.
  useFocusEffect(
    useCallback(() => {
      return () => {
        const y = currentYRef.current;
        if (Math.abs(y - lastWrittenRef.current) >= 16) {
          lastWrittenRef.current = y;
          void setWorkPosition(workId, order, y);
        }
      };
    }, [workId, order]),
  );

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
          scrollEventThrottle={60}
          onContentSizeChange={handleContentSizeChange}
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
                    const liturgyRole = liturgyRoles?.get(hlKey) ?? null;
                    const onPressParagraph = () =>
                      setActiveParagraph({
                        sectionIdx,
                        paragraphIdx: pIdx,
                        text: paragraph.text,
                      });
                    // Drop cap on the very first paragraph of the
                    // chapter. Switched to an absolute-positioned
                    // glyph + paragraph paddingLeft so the giant
                    // oxblood letter never overflows vertically into
                    // a heading above. Only shown when there's no
                    // section heading — when there IS one, the dropcap
                    // was the part that clipped behind it.
                    if (
                      isFirstParagraph &&
                      !section.heading &&
                      !isLiturgy &&
                      paragraph.text.length > 0
                    ) {
                      const firstChar = paragraph.text.charAt(0);
                      const rest = paragraph.text.slice(1);
                      return (
                        <View
                          key={`p-${sectionIdx}-${pIdx}`}
                          style={[
                            styles.dropCapBlock,
                            tint
                              ? {
                                  backgroundColor: tint,
                                  borderRadius: radii.card,
                                }
                              : null,
                          ]}
                        >
                          <Text
                            style={styles.dropCapGlyph}
                            accessibilityElementsHidden
                            importantForAccessibility="no"
                          >
                            {firstChar}
                          </Text>
                          <Text
                            onPress={onPressParagraph}
                            style={[
                              styles.dropCapParagraph,
                              scaledParagraph,
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
                            {rest}
                          </Text>
                        </View>
                      );
                    }
                    // Liturgy voice styling. Rubrics → muted oxblood italic
                    // (the printed service book's red stage directions);
                    // Priest → semibold, Deacon → italic, People → regular.
                    const roleStyle =
                      liturgyRole === null
                        ? null
                        : liturgyRole.isRubric
                          ? styles.rubric
                          : liturgyRole.role === "priest"
                            ? styles.spokenPriest
                            : liturgyRole.role === "deacon"
                              ? styles.spokenDeacon
                              : styles.spokenPeople;
                    return (
                      <Text
                        key={`p-${sectionIdx}-${pIdx}`}
                        onPress={onPressParagraph}
                        style={[
                          styles.paragraph,
                          roleStyle,
                          liturgyRole?.isRubric
                            ? scaledRubric
                            : scaledParagraph,
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

  // Liturgy speaker voices. Priest in semibold (the dominant praying voice),
  // Deacon in italic, People/Singers/Readers in regular. Rubrics — the "The
  // Priest." / "The Deacon." stage directions — render as muted oxblood
  // italics, echoing the red rubrics of a printed service book. These override
  // only fontFamily/color on top of styles.paragraph; size comes from the
  // scaled* style applied after.
  rubric: {
    fontFamily: fonts.serifItalic,
    color: colors.oxbloodInk,
    letterSpacing: 0.2,
  },
  spokenPriest: { fontFamily: fonts.serifBold, color: colors.ink },
  spokenDeacon: { fontFamily: fonts.serifItalic, color: colors.ink },
  spokenPeople: { fontFamily: fonts.serif, color: colors.ink },
  // Legacy inline drop-cap style — kept only for reference if we
  // ever need to render a small inline initial.
  dropCap: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 54,
    lineHeight: 58,
    color: colors.oxbloodInk,
    letterSpacing: -2,
  },
  // The opening drop cap is rendered as an absolutely-positioned
  // glyph inside a block wrapper. The wrapper has a paddingLeft so
  // the paragraph text starts to the right of the cap, and a
  // minHeight so the glyph never overflows downward into the next
  // paragraph either. Crucially, by being position:absolute the cap
  // can never vertically push or overlap any neighbour.
  dropCapBlock: {
    position: "relative",
    minHeight: 70,
    paddingLeft: 56,
    marginTop: spacing.sm,
  },
  dropCapGlyph: {
    position: "absolute",
    top: -6,
    left: 0,
    width: 52,
    fontFamily: fonts.serifBoldItalic,
    fontSize: 64,
    lineHeight: 64,
    color: colors.oxbloodInk,
    letterSpacing: -2,
    textAlign: "left",
  },
  dropCapParagraph: {
    fontFamily: fonts.serif,
    fontSize: 18,
    lineHeight: 32,
    color: colors.ink,
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

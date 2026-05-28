import Feather from "@expo/vector-icons/Feather";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  Eyebrow,
  GiltRule,
  SectionHeader,
} from "@/components/theosis/primitives";
import { colors, fonts, radii, spacing } from "@/constants/theosis-theme";
import { getApi } from "@/lib/api";
import {
  type CompletionMark,
  getCompletions,
  recordLibraryVisit,
} from "@/lib/preferences";

// Work detail — the editorial title page. Composed like the inside cover
// of a printed volume: kind + length kicker, italic display title,
// tappable author byline, era line, gilt rule, then summary + source +
// table of contents as numbered editorial rows.

export default function WorkDetailScreen() {
  const params = useLocalSearchParams<{ slug: string }>();
  const slug = params.slug;

  const api = getApi();
  const libraryQuery = useQuery({
    queryKey: ["library-catalog"],
    queryFn: () => api.fetchLibraryCatalog(),
    staleTime: 60 * 60 * 1000,
  });
  const peopleQuery = useQuery({
    queryKey: ["library-people"],
    queryFn: () => api.fetchLibraryPeople(),
    staleTime: 60 * 60 * 1000,
  });

  const work = useMemo(() => {
    if (!libraryQuery.data) return undefined;
    const matches = libraryQuery.data.works.filter((w) => w.slug === slug);
    if (matches.length === 0) return undefined;
    // Slug collisions happen when HCF commentary-citation scaffolds share a
    // slug with the real ingested work (e.g. `origen-against-celsus` exists
    // as both `hcf:work:origen:against-celsus` with no chapters and
    // `origen-against-celsus` with 8 chapters). Prefer the one that has a
    // chapters entry in byWork so the user lands on the readable record.
    const byWork = libraryQuery.data.index?.byWork;
    return matches.find((w) => byWork?.[w.id] != null) ?? matches[0];
  }, [libraryQuery.data, slug]);

  const author = useMemo(
    () =>
      work && peopleQuery.data
        ? peopleQuery.data.people.find((p) => p.id === work.personId)
        : undefined,
    [work, peopleQuery.data],
  );

  const source = useMemo(
    () =>
      work && libraryQuery.data
        ? libraryQuery.data.sources.find((s) => s.id === work.sourceId)
        : undefined,
    [work, libraryQuery.data],
  );

  const isReferenceOnly = work?.contentStatus === "reference-only";
  const chaptersQuery = useQuery({
    queryKey: ["work-chapters", work?.id],
    queryFn: () => api.fetchWorkChapters(work!.id),
    // Reference-only works carry no chapter bodies — don't fire the request
    // and don't render the loading spinner or empty-TOC card for them.
    enabled: Boolean(work) && !isReferenceOnly,
    staleTime: 60 * 60 * 1000,
  });

  // Record a library visit once the work resolves. Drives the "where
  // I've been reading" feed in the You tab.
  useEffect(() => {
    if (work && slug) {
      void recordLibraryVisit({
        kind: "work",
        slug,
        label: work.shortTitle ?? work.title,
      });
    }
  }, [work, slug]);

  // Pull the user's completion marks on focus so re-entering the work
  // (e.g. after marking a chapter as read) refreshes the ✓ chips.
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
  const completedChapterIds = useMemo<Set<string>>(() => {
    return new Set(
      completions
        .filter((c) => c.kind === "work-chapter")
        .map((c) => c.slug),
    );
  }, [completions]);
  // For the header progress badge — "N of M chapters read".
  const chapterReadCount = useMemo(() => {
    if (!work || !chaptersQuery.data) return 0;
    return chaptersQuery.data.chapters.reduce((acc, ch) => {
      const id = `${work.id}::${ch.order}`;
      return acc + (completedChapterIds.has(id) ? 1 : 0);
    }, 0);
  }, [work, chaptersQuery.data, completedChapterIds]);

  const authorDisplay = author
    ? author.honorific
      ? `${author.honorific} ${author.name.split(",")[0]}`
      : author.name.split(",")[0]
    : null;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "",
          headerBackTitle: author ? author.name.split(",")[0] : "Back",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.accent,
          headerShadowVisible: false,
          // Solid header (not transparent) so the title page below it
          // isn't clipped by the back-button area.
          headerTransparent: false,
        }}
      />
      <View style={styles.root}>
        <LinearGradient
          colors={[
            "rgba(212, 168, 87, 0.10)",
            "transparent",
            colors.background,
          ]}
          locations={[0, 0.3, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {libraryQuery.isLoading && !work ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : null}

          {!libraryQuery.isLoading && !work ? (
            <View style={styles.notFound}>
              <Eyebrow tone="oxblood">Not found</Eyebrow>
              <Text style={styles.notFoundTitle}>No work entry</Text>
              <Text style={styles.notFoundBody}>
                We don&apos;t have an entry for &ldquo;{slug}&rdquo;.
              </Text>
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => [
                  styles.backCta,
                  pressed && { opacity: 0.7 },
                ]}
                accessibilityRole="button"
              >
                <Feather name="arrow-left" size={14} color={colors.accent} />
                <Text style={styles.backCtaLabel}>Back</Text>
              </Pressable>
            </View>
          ) : null}

          {work ? (
            <>
              {/* Title page — kicker + italic display title + author
                  byline + era. The whole block reads like the recto
                  page of a printed book. */}
              <View style={styles.titlePage}>
                <View style={styles.titleKickerRow}>
                  <Eyebrow tone="accent">
                    {work.workType} · {work.lengthLabel}
                  </Eyebrow>
                  {/* Whole-work Read badge — shows when every chapter
                      has been marked. Sits next to the kicker so the
                      user sees "you've read this" the moment they
                      land on the title page. */}
                  {chaptersQuery.data &&
                  chaptersQuery.data.chapters.length > 0 &&
                  chapterReadCount === chaptersQuery.data.chapters.length ? (
                    <View style={styles.wholeWorkReadBadge}>
                      <Feather
                        name="check"
                        size={11}
                        color={colors.background}
                      />
                      <Text style={styles.wholeWorkReadLabel}>
                        Whole work read
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.title}>{work.title}</Text>

                {author && authorDisplay ? (
                  <Pressable
                    onPress={() => router.push(`/people/${author.slug}`)}
                    style={({ pressed }) => [
                      styles.bylineRow,
                      pressed && { opacity: 0.6 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`View ${authorDisplay}`}
                  >
                    <Text style={styles.byline}>
                      by{" "}
                      <Text style={styles.bylineName}>{authorDisplay}</Text>
                    </Text>
                    <Feather
                      name="arrow-up-right"
                      size={13}
                      color={colors.accent}
                    />
                  </Pressable>
                ) : null}

                <Text style={styles.era}>{work.eraLabel}</Text>
                <GiltRule style={{ marginTop: spacing.md }} />
              </View>

              {/* Summary as the lede */}
              {work.summary ? (
                <View style={styles.lede}>
                  <Text style={styles.ledeText}>{work.summary}</Text>
                </View>
              ) : null}

              {/* Where-to-read card — shown in place of the full text for
                  works whose body is not redistributed in-app. */}
              {isReferenceOnly && work.availability ? (
                <View style={styles.whereToReadCard}>
                  <Eyebrow tone="accent">Where to read</Eyebrow>
                  <Text style={styles.whereToReadBody}>
                    The full text of{" "}
                    <Text style={styles.whereToReadEm}>{work.title}</Text> is
                    not redistributed in this app. It is published under
                    copyright by{" "}
                    <Text style={styles.whereToReadPublisher}>
                      {work.availability.publisher ?? "its publisher"}
                    </Text>
                    {work.availability.isbn
                      ? ` (ISBN ${work.availability.isbn})`
                      : ""}
                    .
                  </Text>
                  {work.availability.note ? (
                    <Text style={styles.whereToReadNote}>
                      {work.availability.note}
                    </Text>
                  ) : null}
                  {(work.availability.affiliateUrl ||
                    work.availability.purchaseUrl) ? (
                    <Pressable
                      onPress={() => {
                        const link =
                          work.availability!.affiliateUrl ??
                          work.availability!.purchaseUrl;
                        if (link) void Linking.openURL(link);
                      }}
                      style={({ pressed }) => [
                        styles.whereToReadCta,
                        pressed && { opacity: 0.7 },
                      ]}
                      accessibilityRole="link"
                      accessibilityLabel="Open publisher page"
                    >
                      <Text style={styles.whereToReadCtaLabel}>
                        Open publisher page
                      </Text>
                      <Feather
                        name="external-link"
                        size={14}
                        color={colors.accent}
                      />
                    </Pressable>
                  ) : null}
                  <Text style={styles.whereToReadFootnote}>
                    You can still save this work to your reading list, follow
                    the author, and see which Scripture passages it engages.
                  </Text>
                </View>
              ) : null}

              {/* Source attribution — small editorial fact card */}
              {source && !isReferenceOnly ? (
                <View style={styles.sourceCard}>
                  <Eyebrow tone="soft">Source</Eyebrow>
                  <Text style={styles.sourceCollection}>
                    {source.collection}
                  </Text>
                  <Text style={styles.sourceNote}>{source.label}</Text>
                </View>
              ) : null}

              {/* Contents — numbered editorial TOC */}
              {chaptersQuery.isLoading ? (
                <View style={styles.loading}>
                  <ActivityIndicator color={colors.accent} />
                </View>
              ) : null}

              {chaptersQuery.data &&
              chaptersQuery.data.chapters.length > 0 ? (
                <View style={styles.contentsSection}>
                  <SectionHeader
                    eyebrow={
                      chapterReadCount > 0
                        ? `${chapterReadCount} of ${chaptersQuery.data.chapters.length} read`
                        : `${chaptersQuery.data.chapters.length} ${
                            chaptersQuery.data.chapters.length === 1
                              ? "chapter"
                              : "chapters"
                          }`
                    }
                    title="Contents"
                    rule
                  />
                  {chaptersQuery.data.chapters.map((chapter) => {
                    const isCompleted = completedChapterIds.has(
                      `${work.id}::${chapter.order}`,
                    );
                    return (
                      <Pressable
                        key={chapter.id}
                        onPress={() =>
                          router.push(`/reading/${work.id}/${chapter.order}`)
                        }
                        style={({ pressed }) => [
                          styles.tocRow,
                          isCompleted && styles.tocRowCompleted,
                          pressed && { opacity: 0.6 },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Read ${chapter.label}`}
                        accessibilityState={{ selected: isCompleted }}
                      >
                        <Text style={styles.tocIndex}>
                          {String(chapter.order).padStart(2, "0")}
                        </Text>
                        <View style={styles.tocText}>
                          <Text
                            style={styles.tocLabel}
                            numberOfLines={2}
                          >
                            {chapter.label}
                          </Text>
                          {chapter.title && chapter.title !== chapter.label ? (
                            <Text
                              style={styles.tocTitle}
                              numberOfLines={2}
                            >
                              {chapter.title}
                            </Text>
                          ) : null}
                        </View>
                        {isCompleted ? (
                          <View style={styles.tocReadBadge}>
                            <Feather
                              name="check"
                              size={11}
                              color={colors.background}
                            />
                            <Text style={styles.tocReadBadgeLabel}>
                              Read
                            </Text>
                          </View>
                        ) : null}
                        <Feather
                          name="chevron-right"
                          size={14}
                          color={colors.inkSoft}
                        />
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}

              {!isReferenceOnly &&
              chaptersQuery.data &&
              chaptersQuery.data.chapters.length === 0 ? (
                <View style={styles.emptyTocCard}>
                  <Feather
                    name="book"
                    size={24}
                    color={colors.inkSoft}
                    style={{ marginBottom: spacing.sm }}
                  />
                  <Text style={styles.emptyTocText}>
                    Long-form text for this work isn&apos;t available yet.
                  </Text>
                </View>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing["4xl"] + spacing["2xl"],
    gap: spacing.xl,
  },

  loading: { paddingVertical: spacing["4xl"], alignItems: "center" },

  // Not-found state
  notFound: {
    paddingTop: spacing["3xl"],
    gap: spacing.sm,
    alignItems: "flex-start",
  },
  notFoundTitle: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 36,
    color: colors.ink,
    letterSpacing: -0.5,
    lineHeight: 40,
    marginTop: spacing.sm,
  },
  notFoundBody: {
    fontFamily: fonts.serif,
    fontSize: 15,
    color: colors.inkMuted,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  backCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.lineGilt,
  },
  backCtaLabel: {
    fontFamily: fonts.sans,
    fontSize: 12,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },

  // Title page composition
  titlePage: { gap: spacing.sm },
  titleKickerRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  wholeWorkReadBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  wholeWorkReadLabel: {
    fontFamily: fonts.sans,
    fontSize: 10,
    fontWeight: "700",
    color: colors.background,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 38,
    color: colors.ink,
    letterSpacing: -0.5,
    lineHeight: 42,
    marginTop: spacing.xs,
  },
  bylineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  byline: {
    fontFamily: fonts.serifItalic,
    fontSize: 16,
    color: colors.inkMuted,
    letterSpacing: -0.1,
  },
  bylineName: {
    color: colors.accent,
  },
  era: {
    fontFamily: fonts.serifItalic,
    fontSize: 13,
    color: colors.inkSoft,
  },

  // Lede / summary
  lede: { paddingTop: spacing.xs },
  ledeText: {
    fontFamily: fonts.serif,
    fontSize: 17,
    lineHeight: 28,
    color: colors.ink,
  },

  // Where-to-read (reference-only) card
  whereToReadCard: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
    backgroundColor: colors.accentSoft,
    gap: spacing.sm,
  },
  whereToReadBody: {
    fontFamily: fonts.serif,
    fontSize: 15,
    lineHeight: 24,
    color: colors.ink,
  },
  whereToReadEm: {
    fontFamily: fonts.serifItalic,
  },
  whereToReadPublisher: {
    fontFamily: fonts.serifBoldItalic,
    color: colors.ink,
  },
  whereToReadNote: {
    fontFamily: fonts.serifItalic,
    fontSize: 13,
    lineHeight: 20,
    color: colors.inkMuted,
  },
  whereToReadCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.lineGilt,
    backgroundColor: colors.background,
    marginTop: spacing.xs,
  },
  whereToReadCtaLabel: {
    fontFamily: fonts.sans,
    fontSize: 12,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  whereToReadFootnote: {
    fontFamily: fonts.serifItalic,
    fontSize: 12,
    lineHeight: 18,
    color: colors.inkSoft,
    marginTop: spacing.xs,
  },

  // Source card
  sourceCard: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    gap: 4,
  },
  sourceCollection: {
    fontFamily: fonts.serif,
    fontSize: 17,
    color: colors.ink,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  sourceNote: {
    fontFamily: fonts.serifItalic,
    fontSize: 12,
    color: colors.inkMuted,
  },

  // Contents (TOC) section
  contentsSection: { gap: spacing.xs },
  tocRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  tocRowCompleted: {
    opacity: 0.85,
  },
  tocReadBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    marginTop: 2,
  },
  tocReadBadgeLabel: {
    fontFamily: fonts.sans,
    fontSize: 10,
    fontWeight: "700",
    color: colors.background,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  tocIndex: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 22,
    color: colors.accent,
    letterSpacing: -0.5,
    opacity: 0.85,
    width: 32,
    paddingTop: 2,
  },
  tocText: { flex: 1, gap: 4 },
  tocLabel: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 17,
    color: colors.ink,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  tocTitle: {
    fontFamily: fonts.serif,
    fontSize: 13,
    color: colors.inkMuted,
    lineHeight: 20,
  },

  emptyTocCard: {
    paddingVertical: spacing["3xl"],
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  emptyTocText: {
    fontFamily: fonts.serif,
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 260,
  },
});

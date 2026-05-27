import Feather from "@expo/vector-icons/Feather";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Eyebrow, GiltRule } from "@/components/theosis/primitives";
import { Pill } from "@/components/theosis/pill";
import { colors, fonts, radii, spacing, text } from "@/constants/theosis-theme";
import { getApi } from "@/lib/api";
import {
  addSavedCommentary,
  getProfilePrefs,
  getSavedCommentary,
  removeSavedCommentary,
  savedCommentaryId,
} from "@/lib/preferences";

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
  // name + work title without an additional fetch. `slug` is carried so
  // the work row can deep-link to /works/[slug] for full TOC + prose.
  const lookups = useMemo(() => {
    const peopleById = new Map<
      string,
      { name: string; honorific?: string; slug: string }
    >();
    const worksById = new Map<
      string,
      { title: string; shortTitle: string; slug: string }
    >();
    if (catalogQuery.data) {
      for (const person of catalogQuery.data.people) {
        peopleById.set(person.id, {
          name: person.name,
          honorific: person.honorific,
          slug: person.slug,
        });
      }
      for (const work of catalogQuery.data.works) {
        worksById.set(work.id, {
          title: work.title,
          shortTitle: work.shortTitle,
          slug: work.slug,
        });
      }
    }
    return { peopleById, worksById };
  }, [catalogQuery.data]);

  // User's commentary-fathers config — hides certain Fathers entirely
  // and reorders the rest. Loaded on focus so changes from the picker
  // route are reflected when the user comes back.
  const [orderedSlugs, setOrderedSlugs] = useState<string[]>([]);
  const [hiddenSlugs, setHiddenSlugs] = useState<string[]>([]);
  useFocusEffect(
    useCallback(() => {
      let canceled = false;
      void getProfilePrefs().then((p) => {
        if (canceled) return;
        setOrderedSlugs(p.commentaryFathers?.orderedSlugs ?? []);
        setHiddenSlugs(p.commentaryFathers?.hiddenSlugs ?? []);
      });
      return () => {
        canceled = true;
      };
    }, []),
  );

  // Set of slugs the user has saved on this verse. Tracked separately
  // from disk so the star-toggle UI updates without refetching prefs.
  const verseKey = `${bookSlug}.${chapterNumber}.${verseNumber}`;
  const [savedEntryIds, setSavedEntryIds] = useState<Set<string>>(new Set());
  useFocusEffect(
    useCallback(() => {
      let canceled = false;
      void getSavedCommentary().then((list) => {
        if (canceled) return;
        const onThisVerse = list.filter((c) => c.verseKey === verseKey);
        setSavedEntryIds(new Set(onThisVerse.map((c) => c.entryId)));
      });
      return () => {
        canceled = true;
      };
    }, [verseKey]),
  );

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

  // Group entries by author so the modal opens to a quiet list of
  // Fathers — tap an author, their writings expand inline. Within each
  // group, entries keep the rank-sorted order from the dedupe above so
  // the most-cited piece comes first.
  type AuthorGroup = {
    personId: string;
    entries: typeof sortedUniqueEntries;
    topRank: number; // highest rank in the group, for inter-group sorting
  };
  const groups = useMemo<AuthorGroup[]>(() => {
    const byPerson = new Map<string, AuthorGroup>();
    for (const entry of sortedUniqueEntries) {
      const g = byPerson.get(entry.personId);
      if (g) {
        g.entries.push(entry);
        if (entry.rank > g.topRank) g.topRank = entry.rank;
      } else {
        byPerson.set(entry.personId, {
          personId: entry.personId,
          entries: [entry],
          topRank: entry.rank,
        });
      }
    }
    const raw = Array.from(byPerson.values()).sort(
      (a, b) => b.topRank - a.topRank,
    );

    // Apply the user's commentary-fathers config:
    //   1. Hide groups whose Father is in hiddenSlugs
    //   2. If orderedSlugs is non-empty, sort by that order (groups not
    //      in the list fall to the end, preserving rank order among
    //      themselves)
    const slugById = (id: string) => lookups.peopleById.get(id)?.slug ?? "";
    const filtered = raw.filter((g) => {
      const slug = slugById(g.personId);
      return !hiddenSlugs.includes(slug);
    });
    if (orderedSlugs.length === 0) return filtered;
    const orderIndex = new Map(orderedSlugs.map((s, i) => [s, i]));
    return [...filtered].sort((a, b) => {
      const ai = orderIndex.get(slugById(a.personId)) ?? Number.MAX_SAFE_INTEGER;
      const bi = orderIndex.get(slugById(b.personId)) ?? Number.MAX_SAFE_INTEGER;
      if (ai === bi) return b.topRank - a.topRank;
      return ai - bi;
    });
  }, [sortedUniqueEntries, hiddenSlugs, orderedSlugs, lookups.peopleById]);

  async function toggleEntrySaved(
    entry: typeof sortedUniqueEntries[number],
    personLabel: string,
  ) {
    const id = savedCommentaryId(verseKey, entry.id);
    const next = new Set(savedEntryIds);
    if (savedEntryIds.has(entry.id)) {
      await removeSavedCommentary(verseKey, entry.id);
      next.delete(entry.id);
    } else {
      const work = lookups.worksById.get(entry.workId);
      const person = lookups.peopleById.get(entry.personId);
      await addSavedCommentary({
        verseKey,
        entryId: entry.id,
        personSlug: person?.slug ?? entry.personId,
        personName: personLabel,
        workTitle: work?.shortTitle,
        excerpt: entry.excerpt.slice(0, 200),
      });
      next.add(entry.id);
    }
    setSavedEntryIds(next);
    // Discourage unused-variable lint on `id`:
    void id;
  }

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (personId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(personId)) next.delete(personId);
      else next.add(personId);
      return next;
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
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

      <View style={styles.header}>
        <View style={styles.headerLabel}>
          <Eyebrow tone="accent">Commentary</Eyebrow>
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
          <Feather name="x" size={20} color={colors.inkMuted} />
        </Pressable>
      </View>
      <GiltRule full style={{ marginHorizontal: spacing.xl }} />

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
            <Eyebrow tone="oxblood">Couldn&apos;t load commentary</Eyebrow>
            <Text style={[text.body, { color: colors.error, marginTop: spacing.sm }]}>
              {verseQuery.error instanceof Error
                ? verseQuery.error.message
                : String(verseQuery.error)}
            </Text>
          </View>
        ) : null}

        {!verseQuery.isLoading && groups.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather
              name="message-square"
              size={24}
              color={colors.inkSoft}
              style={{ marginBottom: spacing.sm }}
            />
            <Text style={[text.body, { textAlign: "center" }]}>
              No commentary on this verse yet.
            </Text>
          </View>
        ) : null}

        {groups.length > 0 ? (
          <Text style={styles.groupCount}>
            {groups.length} {groups.length === 1 ? "Father" : "Fathers"}
            {" · "}
            {sortedUniqueEntries.length}{" "}
            {sortedUniqueEntries.length === 1 ? "entry" : "entries"}
          </Text>
        ) : null}

        {groups.map((group) => {
          const person = lookups.peopleById.get(group.personId);
          const isOpen = expanded.has(group.personId);
          const personLabel = person
            ? person.honorific
              ? `${person.honorific} ${person.name.split(",")[0]}`
              : person.name.split(",")[0]
            : group.personId;
          return (
            <View key={group.personId} style={styles.authorBlock}>
              <Pressable
                onPress={() => toggle(group.personId)}
                style={({ pressed }) => [
                  styles.authorHeader,
                  isOpen && styles.authorHeaderOpen,
                  pressed && { opacity: 0.8 },
                ]}
                accessibilityRole="button"
                accessibilityState={{ expanded: isOpen }}
                accessibilityLabel={`${personLabel}, ${group.entries.length} ${
                  group.entries.length === 1 ? "entry" : "entries"
                }, ${isOpen ? "expanded" : "collapsed"}`}
              >
                <View style={styles.authorHeaderText}>
                  <Text style={styles.authorName}>{personLabel}</Text>
                  <Text style={styles.authorCount}>
                    {group.entries.length}{" "}
                    {group.entries.length === 1 ? "entry" : "entries"}
                  </Text>
                </View>
                <Feather
                  name={isOpen ? "chevron-down" : "chevron-right"}
                  size={18}
                  color={isOpen ? colors.accent : colors.inkSoft}
                />
              </Pressable>

              {isOpen ? (
                <View style={styles.authorBody}>
                  {person ? (
                    <Pressable
                      onPress={() => {
                        router.dismiss();
                        router.push(`/people/${person.slug}`);
                      }}
                      style={({ pressed }) => [
                        styles.authorMetaLink,
                        pressed && { opacity: 0.6 },
                      ]}
                      accessibilityRole="button"
                    >
                      <Feather
                        name="user"
                        size={11}
                        color={colors.accent}
                      />
                      <Text style={styles.authorMetaLinkLabel}>
                        Library entry
                      </Text>
                    </Pressable>
                  ) : null}
                  {group.entries.map((entry, idx) => {
                    const work = lookups.worksById.get(entry.workId);
                    const isSaved = savedEntryIds.has(entry.id);
                    return (
                      <View key={entry.id} style={styles.entry}>
                        {idx > 0 ? <GiltRule full style={styles.entrySep} /> : null}
                        <View style={styles.entryHeaderRow}>
                          <View style={{ flex: 1, gap: 4 }}>
                            {work ? (
                              <Pressable
                                onPress={() => {
                                  router.dismiss();
                                  router.push(`/works/${work.slug}`);
                                }}
                                style={({ pressed }) => [
                                  pressed && { opacity: 0.6 },
                                ]}
                                accessibilityRole="button"
                                accessibilityLabel={`Open ${work.title}`}
                              >
                                <Text style={styles.entryWork}>
                                  {work.shortTitle}
                                </Text>
                              </Pressable>
                            ) : null}
                            {entry.title ? (
                              <Text style={styles.entryTitle}>
                                {entry.title}
                              </Text>
                            ) : null}
                          </View>
                          <Pressable
                            onPress={() => toggleEntrySaved(entry, personLabel)}
                            hitSlop={10}
                            style={({ pressed }) => [
                              styles.saveStar,
                              isSaved && styles.saveStarActive,
                              pressed && { opacity: 0.65 },
                            ]}
                            accessibilityRole="button"
                            accessibilityState={{ selected: isSaved }}
                            accessibilityLabel={
                              isSaved
                                ? "Remove from saved commentary"
                                : "Save this commentary entry"
                            }
                          >
                            <Feather
                              name={isSaved ? "bookmark" : "bookmark"}
                              size={14}
                              color={
                                isSaved ? colors.accent : colors.inkMuted
                              }
                            />
                          </Pressable>
                        </View>
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
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  headerLabel: { flex: 1, gap: 4 },
  reference: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 26,
    color: colors.ink,
    letterSpacing: -0.4,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing["4xl"],
    gap: spacing.sm,
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
    alignItems: "center",
  },

  groupCount: {
    fontFamily: fonts.sans,
    fontSize: 10.5,
    fontWeight: "700",
    color: colors.inkSoft,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },

  // Author accordion
  authorBlock: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  authorHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  authorHeaderOpen: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.lineGilt,
    backgroundColor: "rgba(212, 168, 87, 0.04)",
  },
  authorHeaderText: { flex: 1, gap: 2 },
  authorName: {
    fontFamily: fonts.serif,
    fontSize: 18,
    color: colors.ink,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  authorCount: {
    fontFamily: fonts.serifItalic,
    fontSize: 12,
    color: colors.inkSoft,
  },
  authorBody: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  authorMetaLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
  },
  authorMetaLinkLabel: {
    fontFamily: fonts.sans,
    fontSize: 10,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },

  entry: { gap: spacing.sm },
  entrySep: { marginVertical: spacing.sm },
  entryHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  saveStar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  saveStarActive: {
    borderColor: "rgba(212, 168, 87, 0.5)",
    backgroundColor: colors.accentSoft,
  },
  entryWork: {
    fontFamily: fonts.sans,
    fontSize: 10.5,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  entryTitle: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 16,
    color: colors.ink,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  entryExcerpt: {
    fontFamily: fonts.serif,
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

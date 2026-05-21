import { useQuery } from "@tanstack/react-query";
import { Stack, router, useLocalSearchParams } from "expo-router";
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

// Work detail screen — stack route pushed from a person's detail. Shows
// the work's metadata (title, author, era, source) and table of contents
// (chapter list). Each chapter row pushes /reading/[workId]/[order]
// where the full prose is read.

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

  const work = useMemo(
    () => libraryQuery.data?.works.find((w) => w.slug === slug),
    [libraryQuery.data, slug],
  );

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

  // Fetch chapter summaries only when we know the workId. Skipping until
  // libraryQuery resolves avoids a 404 on an unknown slug.
  const chaptersQuery = useQuery({
    queryKey: ["work-chapters", work?.id],
    queryFn: () => api.fetchWorkChapters(work!.id),
    enabled: Boolean(work),
    staleTime: 60 * 60 * 1000,
  });

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
        }}
      />
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
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
            <View style={styles.emptyCard}>
              <Text style={text.eyebrow}>Not found</Text>
              <Text style={text.body}>
                We don&apos;t have an entry for &ldquo;{slug}&rdquo;.
              </Text>
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => [pressed && { opacity: 0.6 }]}
              >
                <Text style={styles.backLink}>← Back</Text>
              </Pressable>
            </View>
          ) : null}

          {work ? (
            <>
              <View style={styles.titleBlock}>
                <View style={styles.metaRow}>
                  <Pill variant="subtle">{work.workType}</Pill>
                  <Text style={styles.lengthLabel}>{work.lengthLabel}</Text>
                </View>
                <Text style={styles.title}>{work.title}</Text>
                <Text style={styles.era}>{work.eraLabel}</Text>
              </View>

              {work.summary ? (
                <Text style={styles.summary}>{work.summary}</Text>
              ) : null}

              {author ? (
                <Pressable
                  onPress={() => router.push(`/people/${author.slug}`)}
                  style={({ pressed }) => [
                    styles.factBlock,
                    pressed && styles.factBlockPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${author.name}`}
                >
                  <Text style={styles.factLabel}>Attributed to</Text>
                  <Text style={styles.factValue}>
                    {author.honorific ? `${author.honorific} ` : ""}
                    {author.name}
                  </Text>
                </Pressable>
              ) : null}

              {source ? (
                <View style={styles.factBlock}>
                  <Text style={styles.factLabel}>Source</Text>
                  <Text style={styles.factValue}>{source.collection}</Text>
                  <Text style={styles.factNote}>{source.label}</Text>
                </View>
              ) : null}

              {chaptersQuery.isLoading ? (
                <View style={styles.loading}>
                  <ActivityIndicator color={colors.accent} />
                </View>
              ) : null}

              {chaptersQuery.data && chaptersQuery.data.chapters.length > 0 ? (
                <View style={styles.tocBlock}>
                  <Text style={styles.tocLabel}>Contents</Text>
                  {chaptersQuery.data.chapters.map((chapter) => (
                    <Pressable
                      key={chapter.id}
                      onPress={() =>
                        router.push(`/reading/${work.id}/${chapter.order}`)
                      }
                      style={({ pressed }) => [
                        styles.tocRow,
                        pressed && styles.tocRowPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Read ${chapter.label}`}
                    >
                      <Text style={styles.tocOrder}>{chapter.order}</Text>
                      <View style={styles.tocMain}>
                        <Text style={styles.tocChapterLabel}>
                          {chapter.label}
                        </Text>
                        {chapter.title && chapter.title !== chapter.label ? (
                          <Text style={styles.tocChapterTitle} numberOfLines={1}>
                            {chapter.title}
                          </Text>
                        ) : null}
                      </View>
                      <Text style={styles.tocChevron}>›</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              {chaptersQuery.data &&
              chaptersQuery.data.chapters.length === 0 ? (
                <View style={styles.emptyTocCard}>
                  <Text style={text.body}>
                    Long-form text for this work isn&apos;t available yet.
                  </Text>
                </View>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing["4xl"],
    gap: spacing.lg,
  },

  loading: { paddingVertical: spacing["3xl"], alignItems: "center" },
  emptyCard: {
    paddingVertical: spacing["3xl"],
    gap: spacing.md,
  },
  backLink: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: "600",
  },

  titleBlock: { gap: spacing.sm },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  lengthLabel: {
    fontSize: 11,
    color: colors.inkSoft,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 30,
    color: colors.ink,
    letterSpacing: -0.4,
    lineHeight: 36,
  },
  era: {
    fontFamily: fonts.serif,
    fontSize: 14,
    color: colors.inkMuted,
    fontStyle: "italic",
  },

  summary: {
    fontSize: 15,
    lineHeight: 25,
    color: colors.inkMuted,
  },

  factBlock: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  factBlockPressed: { backgroundColor: colors.surfaceStrong },
  factLabel: {
    fontSize: 10.4,
    fontWeight: "500",
    color: colors.inkSoft,
    letterSpacing: 2.4,
    textTransform: "uppercase",
  },
  factValue: {
    fontFamily: fonts.serif,
    fontSize: 18,
    color: colors.ink,
  },
  factNote: {
    fontSize: 13,
    color: colors.inkMuted,
  },

  tocBlock: { gap: spacing.sm },
  tocLabel: {
    fontFamily: fonts.serif,
    fontSize: 18,
    color: colors.accent,
    letterSpacing: -0.2,
  },
  tocRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  tocRowPressed: { backgroundColor: colors.surfaceStrong },
  tocOrder: {
    fontFamily: fonts.mono,
    fontSize: 13,
    color: colors.accent,
    minWidth: 24,
    textAlign: "right",
  },
  tocMain: { flex: 1, gap: 2 },
  tocChapterLabel: {
    fontFamily: fonts.serif,
    fontSize: 17,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  tocChapterTitle: {
    fontSize: 12,
    color: colors.inkSoft,
  },
  tocChevron: {
    fontSize: 20,
    color: colors.inkSoft,
  },
  emptyTocCard: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
});

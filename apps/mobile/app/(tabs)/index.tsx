import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router } from "expo-router";
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

import { PageHeader } from "@/components/theosis/page-header";
import { Pill } from "@/components/theosis/pill";
import { Surface } from "@/components/theosis/surface";
import { colors, fonts, radii, spacing, text } from "@/constants/theosis-theme";
import { getApi } from "@/lib/api";

// Build a Bible-reader URL for an appointed reading. Mirrors
// src/lib/content/reading-href.ts on the web: `?highlight=3-12` (range)
// or `?highlight=3` (single verse).
function readingHref(
  translation: string,
  scripture: {
    bookSlug: string;
    chapterNumber: number;
    verseStart: number;
    verseEnd?: number;
  },
): string {
  const { bookSlug, chapterNumber, verseStart, verseEnd } = scripture;
  const range =
    verseEnd && verseEnd !== verseStart
      ? `${verseStart}-${verseEnd}`
      : `${verseStart}`;
  return `/explore?translation=${translation}&book=${bookSlug}&chapter=${chapterNumber}&highlight=${range}`;
}

// Daily Commemoration screen — mobile port of src/app/(shell)/daily/page.tsx.
// All data composes server-side via /api/daily; this screen just fetches
// once via React Query and renders. Visual design mirrors the web Daily
// page: dark surface cards, gilt accent pills, serif headlines.

function formatDate(isoDate: string): string {
  // Match the web's UTC-based formatter so the displayed weekday agrees
  // with the resolved ISO date regardless of the user's timezone.
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(isoDate));
}

export default function DailyScreen() {
  const api = getApi();
  const { data, error, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["daily"],
    queryFn: () => api.fetchDaily(),
    staleTime: 5 * 60 * 1000,
  });

  // The first linked saint with an extendedSummary becomes the "Read more"
  // source. Matches the web page's logic.
  const saintWithBio = useMemo(
    () => data?.saints.find((saint) => Boolean(saint.extendedSummary)),
    [data?.saints],
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : null}

        {error ? (
          <Surface tone="quiet" style={styles.errorCard}>
            <Text style={text.eyebrow}>Couldn't load today</Text>
            <Text style={[text.body, { color: colors.error, marginTop: spacing.sm }]}>
              {error instanceof Error ? error.message : String(error)}
            </Text>
            <Pressable
              onPress={() => refetch()}
              style={({ pressed }) => [
                styles.retry,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.retryLabel}>
                {isFetching ? "Retrying…" : "Try again"}
              </Text>
            </Pressable>
          </Surface>
        ) : null}

        {data ? (
          <>
            <View style={styles.dateBanner}>
              <Text style={styles.dateText}>{formatDate(data.daily.isoDate)}</Text>
            </View>

            <PageHeader
              eyebrow="Daily"
              title={data.daily.title}
              description={data.daily.summary}
            />

            <Surface style={styles.commemorationCard}>
              {(data.daily.feastLabel || data.daily.fastLabel) ? (
                <View style={styles.pillRow}>
                  {data.daily.feastLabel ? (
                    <Pill variant="accent">{data.daily.feastLabel}</Pill>
                  ) : null}
                  {data.daily.fastLabel ? (
                    <Pill variant="subtle">{data.daily.fastLabel}</Pill>
                  ) : null}
                </View>
              ) : null}

              {data.primaryIcon ? (
                <View style={styles.iconWrap}>
                  <Image
                    source={{ uri: data.primaryIcon.src }}
                    style={styles.icon}
                    contentFit="contain"
                    transition={200}
                    accessibilityLabel={data.primaryIcon.alt}
                  />
                </View>
              ) : null}

              {saintWithBio?.extendedSummary ? (
                <View style={styles.bioBlock}>
                  <Text style={styles.bioLabel}>
                    About {saintWithBio.name.split(",")[0]}
                  </Text>
                  {saintWithBio.extendedSummary
                    .split("\n\n")
                    .slice(0, 2)
                    .map((paragraph, index) => (
                      <Text key={index} style={styles.bioParagraph}>
                        {paragraph}
                      </Text>
                    ))}
                  <Pressable
                    onPress={() => router.push(`/people/${saintWithBio.slug}`)}
                    style={({ pressed }) => [pressed && { opacity: 0.6 }]}
                    accessibilityRole="button"
                  >
                    <Text style={styles.bioLink}>Full library entry →</Text>
                  </Pressable>
                </View>
              ) : null}

              {data.saints.length > 0 ? (
                <View style={styles.saintList}>
                  {data.saints.map((saint) => {
                    const icon = data.saintIcons[saint.id];
                    return (
                      <Pressable
                        key={saint.id}
                        onPress={() => router.push(`/people/${saint.slug}`)}
                        style={({ pressed }) => [
                          styles.saintRow,
                          pressed && styles.saintRowPressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Open library entry for ${saint.name}`}
                      >
                        {icon ? (
                          <Image
                            source={{ uri: icon.src }}
                            style={styles.saintIcon}
                            contentFit="cover"
                            transition={200}
                            accessibilityLabel={icon.alt}
                          />
                        ) : (
                          <View style={[styles.saintIcon, styles.saintIconPlaceholder]}>
                            <Text style={styles.saintIconLetter}>
                              {saint.name.charAt(0)}
                            </Text>
                          </View>
                        )}
                        <View style={styles.saintMeta}>
                          <Text style={styles.saintKind}>{saint.kind}</Text>
                          <Text style={styles.saintName}>{saint.name}</Text>
                        </View>
                        <Text style={styles.saintChevron}>›</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}

              {data.daily.additionalCommemorations.length > 0 ? (
                <View style={styles.alsoCommemorated}>
                  <Text style={styles.sectionLabel}>Also commemorated</Text>
                  {data.daily.additionalCommemorations.map((item, index) => {
                    const linkedSaint = item.saintId
                      ? data.saints.find((s) => s.id === item.saintId)
                      : undefined;
                    const content = (
                      <Text style={styles.alsoLine}>
                        <Text
                          style={
                            linkedSaint ? styles.alsoNameLink : styles.alsoName
                          }
                        >
                          {item.name}
                        </Text>
                        {item.summary ? (
                          <Text style={styles.alsoSummary}>
                            {" "}
                            — {item.summary}
                          </Text>
                        ) : null}
                      </Text>
                    );
                    return linkedSaint ? (
                      <Pressable
                        key={`${item.name}-${index}`}
                        onPress={() =>
                          router.push(`/people/${linkedSaint.slug}`)
                        }
                        style={({ pressed }) => [
                          pressed && { opacity: 0.6 },
                        ]}
                      >
                        {content}
                      </Pressable>
                    ) : (
                      <View key={`${item.name}-${index}`}>{content}</View>
                    );
                  })}
                </View>
              ) : null}
            </Surface>

            <Surface style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionEyebrow}>Readings</Text>
                <Text style={styles.sectionTitle}>Scripture for the day</Text>
              </View>
              {data.readings.length > 0 ? (
                <View style={styles.readingList}>
                  {data.readings.map((reading) => (
                    <Pressable
                      key={reading.id}
                      onPress={() =>
                        router.push(
                          readingHref(data.translationSlug, reading.scripture),
                        )
                      }
                      style={({ pressed }) => [
                        styles.readingCard,
                        pressed && styles.readingCardPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${reading.scripture.label}`}
                    >
                      <View style={styles.readingTopRow}>
                        <Pill>{reading.label}</Pill>
                        <Text style={styles.readingContext}>
                          {reading.contextLabel}
                        </Text>
                      </View>
                      <Text style={styles.readingScripture}>
                        {reading.scripture.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Text style={text.body}>
                  No appointed readings for this day yet — weekday lectionary
                  coverage is still being filled in.
                </Text>
              )}
            </Surface>

            <Surface style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionEyebrow}>Hymns</Text>
                <Text style={styles.sectionTitle}>Troparion and kontakion</Text>
              </View>
              {data.hymns.length > 0 ? (
                <View style={styles.hymnList}>
                  {data.hymns.map((hymn) => (
                    <View key={hymn.id} style={styles.hymnCard}>
                      <View style={styles.readingTopRow}>
                        <Pill variant="subtle">{hymn.type}</Pill>
                        <Text style={styles.readingContext}>{hymn.tone}</Text>
                      </View>
                      <Text style={styles.hymnTitle}>{hymn.title}</Text>
                      <Text style={styles.hymnText}>{hymn.text}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={text.body}>
                  No hymns yet appointed for this day — the corpus is being
                  filled in with original English translations.
                </Text>
              )}
            </Surface>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing["4xl"],
    gap: spacing["2xl"],
  },
  loading: { paddingVertical: spacing["3xl"], alignItems: "center" },

  errorCard: { gap: spacing.sm },
  retry: { marginTop: spacing.md, alignSelf: "flex-start" },
  retryLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.accent,
    paddingVertical: spacing.xs,
  },

  // Centered date banner — small uppercase, tracked.
  dateBanner: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  dateText: {
    fontSize: 11.5,
    fontWeight: "500",
    color: colors.inkSoft,
    letterSpacing: 2.4,
    textTransform: "uppercase",
  },

  commemorationCard: { gap: spacing.xl },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  iconWrap: { alignItems: "center", paddingVertical: spacing.xs },
  icon: {
    width: 200,
    height: 240,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surfaceStrong,
  },

  bioBlock: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  bioLabel: {
    fontSize: 10.4,
    fontWeight: "500",
    color: colors.inkSoft,
    letterSpacing: 2.4,
    textTransform: "uppercase",
  },
  bioParagraph: {
    fontSize: 14,
    lineHeight: 24,
    color: colors.inkMuted,
  },
  bioLink: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.accent,
    paddingTop: spacing.xs,
  },

  saintList: { gap: spacing.md },
  saintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  saintRowPressed: {
    backgroundColor: colors.surfaceStrong,
  },
  saintChevron: {
    fontSize: 22,
    color: colors.inkSoft,
    marginLeft: spacing.xs,
  },
  saintIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surfaceStrong,
  },
  saintIconPlaceholder: { alignItems: "center", justifyContent: "center" },
  saintIconLetter: {
    fontFamily: fonts.serif,
    fontSize: 20,
    color: colors.accent,
  },
  saintMeta: { flex: 1, gap: 4 },
  saintKind: {
    fontSize: 10.4,
    fontWeight: "500",
    color: colors.inkSoft,
    letterSpacing: 2.4,
    textTransform: "uppercase",
  },
  saintName: {
    fontFamily: fonts.serif,
    fontSize: 20,
    color: colors.ink,
    lineHeight: 26,
    letterSpacing: -0.3,
  },

  alsoCommemorated: { gap: spacing.sm },
  sectionLabel: {
    fontSize: 10.4,
    fontWeight: "500",
    color: colors.inkSoft,
    letterSpacing: 2.4,
    textTransform: "uppercase",
  },
  alsoLine: { fontSize: 14, lineHeight: 22 },
  alsoName: { color: colors.ink },
  alsoNameLink: { color: colors.ink, textDecorationLine: "underline", textDecorationColor: colors.line },
  alsoSummary: { color: colors.inkSoft },

  section: { gap: spacing.lg },
  sectionHeader: { gap: spacing.xs },
  sectionEyebrow: {
    fontSize: 10.4,
    fontWeight: "500",
    color: colors.inkSoft,
    letterSpacing: 2.4,
    textTransform: "uppercase",
  },
  sectionTitle: {
    fontFamily: fonts.serif,
    fontSize: 26,
    color: colors.ink,
    lineHeight: 32,
    letterSpacing: -0.3,
  },

  readingList: { gap: spacing.md },
  readingCard: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  readingCardPressed: {
    backgroundColor: colors.surfaceStrong,
  },
  readingTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  readingContext: {
    fontSize: 11,
    color: colors.inkSoft,
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
  readingScripture: {
    fontFamily: fonts.serif,
    fontSize: 22,
    color: colors.ink,
    lineHeight: 28,
    letterSpacing: -0.3,
  },

  hymnList: { gap: spacing.md },
  hymnCard: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  hymnTitle: {
    fontFamily: fonts.serif,
    fontSize: 22,
    color: colors.ink,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  hymnText: {
    fontSize: 14,
    lineHeight: 24,
    color: colors.inkMuted,
  },
});

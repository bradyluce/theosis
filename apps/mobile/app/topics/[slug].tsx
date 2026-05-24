import Feather from "@expo/vector-icons/Feather";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  Eyebrow,
  GiltRule,
  Halo,
  SectionHeader,
} from "@/components/theosis/primitives";
import { colors, fonts, radii, spacing, text } from "@/constants/theosis-theme";
import { getApi } from "@/lib/api";

// Topic landing page — the Library tab's curated study-guide surface.
// Editorial intro + Scripture rail + Fathers grid + Works list + related
// chips. Slug-driven: pulled from /api/topics/[slug] which returns the
// topic itself plus enriched Father/Work records (icons, full metadata).

export default function TopicScreen() {
  const params = useLocalSearchParams<{ slug: string }>();
  const slug = params.slug;
  const api = getApi();

  const topicQuery = useQuery({
    queryKey: ["topic", slug],
    queryFn: () => api.fetchTopic(slug as string),
    enabled: Boolean(slug),
    staleTime: 60 * 60 * 1000,
  });

  const data = topicQuery.data;
  const paragraphs = data?.topic.body.split("\n\n").filter((p) => p.trim()) ?? [];

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "",
          headerBackTitle: "Library",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.accent,
          headerShadowVisible: false,
          headerTransparent: false,
        }}
      />
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
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

        {topicQuery.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : null}

        {topicQuery.error ? (
          <View style={styles.errorWrap}>
            <Eyebrow tone="oxblood">Couldn&apos;t load topic</Eyebrow>
            <Text style={[text.body, { color: colors.error, marginTop: spacing.sm }]}>
              {topicQuery.error instanceof Error
                ? topicQuery.error.message
                : String(topicQuery.error)}
            </Text>
          </View>
        ) : null}

        {data ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Title spread */}
            <View style={styles.header}>
              <Eyebrow tone="accent">Topic</Eyebrow>
              <Text style={styles.title}>{data.topic.label}</Text>
              {data.topic.subtitle ? (
                <Text style={styles.subtitle}>{data.topic.subtitle}</Text>
              ) : null}
              <GiltRule full style={{ marginTop: spacing.lg }} />
            </View>

            {/* Body prose */}
            <View style={styles.bodyWrap}>
              {paragraphs.map((para, idx) => (
                <Text key={idx} style={styles.bodyParagraph}>
                  {renderInlineEm(para)}
                </Text>
              ))}
            </View>

            {/* Pullquote */}
            {data.topic.pullquote ? (
              <View style={styles.pullquoteWrap}>
                <Text style={styles.pullquoteText}>
                  &ldquo;{data.topic.pullquote.text}&rdquo;
                </Text>
                <Text style={styles.pullquoteAttr}>
                  — {data.topic.pullquote.attribution}
                </Text>
              </View>
            ) : null}

            {/* Key Scripture */}
            {data.topic.keyScripture.length > 0 ? (
              <View style={styles.section}>
                <SectionHeader eyebrow="Scripture" title="Key passages" rule />
                <View style={styles.scriptureList}>
                  {data.topic.keyScripture.map((ref, idx) => (
                    <Pressable
                      key={`${ref.label}-${idx}`}
                      onPress={() => {
                        const range =
                          ref.verseEnd && ref.verseEnd !== ref.verseStart
                            ? `${ref.verseStart}-${ref.verseEnd}`
                            : `${ref.verseStart}`;
                        router.push(
                          `/explore?book=${ref.bookSlug}&chapter=${ref.chapterNumber}&highlight=${range}`,
                        );
                      }}
                      style={({ pressed }) => [
                        styles.scriptureRow,
                        pressed && { opacity: 0.7 },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${ref.label}`}
                    >
                      <View style={styles.scriptureLeft}>
                        <Text style={styles.scriptureIndex}>
                          {String(idx + 1).padStart(2, "0")}
                        </Text>
                      </View>
                      <View style={styles.scriptureMid}>
                        <Text style={styles.scriptureRefLabel}>{ref.label}</Text>
                        <Text style={styles.scriptureGloss} numberOfLines={3}>
                          {ref.gloss}
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={16} color={colors.inkSoft} />
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Key Fathers */}
            {data.fathers.length > 0 ? (
              <View style={styles.section}>
                <SectionHeader eyebrow="Patristic voices" title="Key Fathers" rule />
                <View style={styles.fathersList}>
                  {data.fathers.map((father) => (
                    <Pressable
                      key={father.id}
                      onPress={() => router.push(`/people/${father.slug}`)}
                      style={({ pressed }) => [
                        styles.fatherRow,
                        pressed && styles.fatherRowPressed,
                      ]}
                      accessibilityRole="button"
                    >
                      {father.icon ? (
                        <Halo size={56} glow={false} ringTone="muted">
                          <Image
                            source={{ uri: father.icon.src }}
                            style={styles.fatherIconImage}
                            contentFit="cover"
                            transition={150}
                            accessibilityLabel={father.icon.alt}
                          />
                        </Halo>
                      ) : (
                        <Halo size={56} glow={false} ringTone="muted">
                          <Text style={styles.fatherInitial}>
                            {father.name.charAt(0)}
                          </Text>
                        </Halo>
                      )}
                      <View style={styles.fatherText}>
                        <Text style={styles.fatherName}>
                          {father.honorific ? `${father.honorific} ` : ""}
                          {father.name.split(",")[0]}
                        </Text>
                        <Text style={styles.fatherEra}>{father.eraLabel}</Text>
                      </View>
                      <Feather name="chevron-right" size={16} color={colors.inkSoft} />
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Key Works */}
            {data.works.length > 0 ? (
              <View style={styles.section}>
                <SectionHeader eyebrow="Bibliography" title="Key works" rule />
                <View style={styles.worksList}>
                  {data.works.map((work) => (
                    <Pressable
                      key={work.id}
                      onPress={() => router.push(`/works/${work.slug}`)}
                      style={({ pressed }) => [
                        styles.workRow,
                        pressed && styles.workRowPressed,
                      ]}
                      accessibilityRole="button"
                    >
                      <View style={styles.workIcon}>
                        <Feather name="book" size={16} color={colors.accent} />
                      </View>
                      <View style={styles.workText}>
                        <Text style={styles.workTitle} numberOfLines={2}>
                          {work.title}
                        </Text>
                        <Text style={styles.workMeta}>
                          {work.workType} · {work.eraLabel}
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={16} color={colors.inkSoft} />
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Related saints */}
            {data.saints.length > 0 ? (
              <View style={styles.section}>
                <SectionHeader eyebrow="In their lives" title="Related saints" rule />
                <View style={styles.fathersList}>
                  {data.saints.map((saint) => (
                    <Pressable
                      key={saint.id}
                      onPress={() => router.push(`/people/${saint.slug}`)}
                      style={({ pressed }) => [
                        styles.fatherRow,
                        pressed && styles.fatherRowPressed,
                      ]}
                      accessibilityRole="button"
                    >
                      {saint.icon ? (
                        <Halo size={48} glow={false} ringTone="muted">
                          <Image
                            source={{ uri: saint.icon.src }}
                            style={styles.fatherIconImage}
                            contentFit="cover"
                            transition={150}
                            accessibilityLabel={saint.icon.alt}
                          />
                        </Halo>
                      ) : (
                        <Halo size={48} glow={false} ringTone="muted">
                          <Text style={styles.fatherInitial}>
                            {saint.name.charAt(0)}
                          </Text>
                        </Halo>
                      )}
                      <View style={styles.fatherText}>
                        <Text style={styles.fatherName}>
                          {saint.honorific ? `${saint.honorific} ` : ""}
                          {saint.name.split(",")[0]}
                        </Text>
                        <Text style={styles.fatherEra}>{saint.eraLabel}</Text>
                      </View>
                      <Feather name="chevron-right" size={16} color={colors.inkSoft} />
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Related topics */}
            {data.topic.relatedTopics.length > 0 ? (
              <View style={styles.section}>
                <Eyebrow tone="accent">Continue exploring</Eyebrow>
                <GiltRule style={{ marginBottom: spacing.md }} />
                <View style={styles.chipsRow}>
                  {data.topic.relatedTopics.map((slug) => (
                    <Pressable
                      key={slug}
                      onPress={() => router.push(`/topics/${slug}`)}
                      style={({ pressed }) => [
                        styles.relatedChip,
                        pressed && { opacity: 0.7 },
                      ]}
                      accessibilityRole="button"
                    >
                      <Text style={styles.relatedChipLabel}>
                        {slug
                          .replace(/-/g, " ")
                          .replace(/\b\w/g, (c) => c.toUpperCase())}
                      </Text>
                      <Feather
                        name="arrow-up-right"
                        size={11}
                        color={colors.accent}
                      />
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </>
  );
}

// Render plain text with *italic* segments turned into <Text style={italic}>
// runs. Lightweight — for the body of topic pages. Returns an array of
// React nodes suitable for embedding in a <Text>.
function renderInlineEm(input: string) {
  const parts = input.split(/(\*[^*]+\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return (
        <Text key={idx} style={styles.bodyItalic}>
          {part.slice(1, -1)}
        </Text>
      );
    }
    return <Text key={idx}>{part}</Text>;
  });
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing["4xl"],
    gap: spacing["2xl"],
  },
  loading: { paddingVertical: spacing["4xl"], alignItems: "center" },
  errorWrap: { padding: spacing.xl, gap: spacing.xs },

  header: { gap: spacing.xs },
  title: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 44,
    color: colors.ink,
    letterSpacing: -0.8,
    lineHeight: 48,
    marginTop: spacing.sm,
  },
  subtitle: {
    fontFamily: fonts.serifItalic,
    fontSize: 18,
    color: colors.inkMuted,
    lineHeight: 24,
    marginTop: spacing.sm,
  },

  bodyWrap: { gap: spacing.md },
  bodyParagraph: {
    fontFamily: fonts.serif,
    fontSize: 17,
    lineHeight: 28,
    color: colors.ink,
    letterSpacing: 0.05,
  },
  bodyItalic: {
    fontFamily: fonts.serifItalic,
    fontSize: 17,
  },

  pullquoteWrap: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderLeftWidth: 2,
    borderLeftColor: colors.lineGilt,
    gap: spacing.sm,
  },
  pullquoteText: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 22,
    lineHeight: 30,
    color: colors.accent,
    letterSpacing: -0.3,
  },
  pullquoteAttr: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: "600",
    color: colors.inkSoft,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },

  section: { gap: spacing.xs },

  scriptureList: { marginTop: spacing.md, gap: spacing.xs },
  scriptureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  scriptureLeft: { width: 32 },
  scriptureIndex: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 22,
    color: colors.accent,
    opacity: 0.8,
  },
  scriptureMid: { flex: 1, gap: 4 },
  scriptureRefLabel: {
    fontFamily: fonts.serif,
    fontSize: 17,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  scriptureGloss: {
    fontFamily: fonts.serifItalic,
    fontSize: 13,
    lineHeight: 20,
    color: colors.inkSoft,
  },

  fathersList: { marginTop: spacing.md, gap: spacing.xs },
  fatherRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  fatherRowPressed: {
    backgroundColor: "rgba(212, 168, 87, 0.05)",
    borderRadius: radii.card,
  },
  fatherIconImage: { width: "100%", height: "100%" },
  fatherInitial: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 22,
    color: colors.accent,
  },
  fatherText: { flex: 1, gap: 2 },
  fatherName: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.ink,
    letterSpacing: -0.1,
  },
  fatherEra: {
    fontFamily: fonts.serifItalic,
    fontSize: 12,
    color: colors.inkSoft,
  },

  worksList: { marginTop: spacing.md, gap: spacing.xs },
  workRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  workRowPressed: {
    backgroundColor: "rgba(212, 168, 87, 0.05)",
    borderRadius: radii.card,
  },
  workIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.card,
    backgroundColor: "rgba(212, 168, 87, 0.08)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
    alignItems: "center",
    justifyContent: "center",
  },
  workText: { flex: 1, gap: 2 },
  workTitle: {
    fontFamily: fonts.serif,
    fontSize: 15,
    color: colors.ink,
    letterSpacing: -0.1,
    lineHeight: 20,
  },
  workMeta: {
    fontFamily: fonts.serifItalic,
    fontSize: 11,
    color: colors.inkSoft,
  },

  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  relatedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
    backgroundColor: "rgba(212, 168, 87, 0.04)",
  },
  relatedChipLabel: {
    fontFamily: fonts.serifItalic,
    fontSize: 13,
    color: colors.ink,
  },
});

import { useQuery } from "@tanstack/react-query";
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

import { Eyebrow, GiltRule } from "@/components/theosis/primitives";
import { colors, fonts, radii, spacing, text } from "@/constants/theosis-theme";
import { getApi } from "@/lib/api";

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
                    <Text style={styles.sectionHeading}>{section.heading}</Text>
                  ) : null}
                  {section.paragraphs.map((paragraph, pIdx) => {
                    const isFirstParagraph = sectionIdx === 0 && pIdx === 0;
                    // Drop cap on the very first paragraph of the
                    // chapter — oxblood illuminated initial, mirrors the
                    // Bible reader's verse-1 treatment.
                    if (isFirstParagraph && paragraph.text.length > 0) {
                      const firstChar = paragraph.text.charAt(0);
                      const rest = paragraph.text.slice(1);
                      return (
                        <Text
                          key={`p-${sectionIdx}-${pIdx}`}
                          style={styles.paragraph}
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
                        style={styles.paragraph}
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
    paddingTop: spacing.sm,
  },
  sectionHeading: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 20,
    color: colors.accent,
    letterSpacing: -0.3,
    lineHeight: 26,
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
  dropCap: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 56,
    lineHeight: 50,
    color: colors.oxbloodInk,
    letterSpacing: -2,
  },

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

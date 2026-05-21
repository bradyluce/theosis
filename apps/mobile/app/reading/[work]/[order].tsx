import { useQuery } from "@tanstack/react-query";
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

import { colors, fonts, radii, spacing, text } from "@/constants/theosis-theme";
import { getApi } from "@/lib/api";

// Chapter reader — full-screen prose. Stack route pushed from a work
// detail's table of contents. Each WorkChapterSection renders with its
// heading + paragraphs; paragraph numbers (from NPNF / source) render
// as a small mono superscript in accent gold, matching the web reader.

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
          headerTitle: chapterQuery.data?.chapter.label ?? "",
          headerTitleStyle: {
            fontFamily: fonts.serif,
            fontSize: 17,
          },
          headerBackTitle: "Contents",
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
          {chapterQuery.isLoading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : null}

          {chapterQuery.error ? (
            <View style={styles.errorCard}>
              <Text style={text.eyebrow}>Couldn&apos;t load chapter</Text>
              <Text style={[text.body, { color: colors.error }]}>
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
              <View style={styles.titleBlock}>
                <Text style={styles.eyebrow}>{chapterQuery.data.chapter.label}</Text>
                <Text style={styles.title}>
                  {chapterQuery.data.chapter.title}
                </Text>
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
                  {section.paragraphs.map((paragraph, pIdx) => (
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
                  ))}
                </View>
              ))}

              <Text style={styles.footer}>End of {chapterQuery.data.chapter.label}.</Text>
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
    fontSize: 14,
    color: colors.accent,
    fontWeight: "600",
  },

  titleBlock: { gap: spacing.xs },
  eyebrow: {
    fontSize: 10.4,
    fontWeight: "500",
    color: colors.inkSoft,
    letterSpacing: 2.4,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 26,
    color: colors.ink,
    letterSpacing: -0.4,
    lineHeight: 32,
  },

  chapterSummary: {
    fontSize: 14,
    lineHeight: 24,
    color: colors.inkSoft,
    fontStyle: "italic",
    borderLeftWidth: 2,
    borderLeftColor: "rgba(212, 168, 87, 0.4)",
    paddingLeft: spacing.md,
  },

  section: {
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  sectionHeading: {
    fontFamily: fonts.serif,
    fontSize: 18,
    color: colors.accent,
    letterSpacing: -0.2,
    lineHeight: 24,
  },
  paragraph: {
    fontFamily: fonts.serif,
    fontSize: 17,
    lineHeight: 30,
    color: colors.ink,
  },
  paragraphNumber: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.accent,
    fontWeight: "500",
  },

  footer: {
    fontSize: 11,
    color: colors.inkSoft,
    textAlign: "center",
    fontStyle: "italic",
    paddingTop: spacing.lg,
  },
});

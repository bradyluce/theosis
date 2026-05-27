import Feather from "@expo/vector-icons/Feather";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { GuideRelatedRef } from "@theosis/core";

import { Eyebrow, GiltRule } from "@/components/theosis/primitives";
import { colors, fonts, radii, spacing, text } from "@/constants/theosis-theme";
import { getApi } from "@/lib/api";
import { recordLibraryVisit } from "@/lib/preferences";

// Orthodox-basics guide reader. Long-form catechetical / practical prose
// authored by Theosis. Editorial chrome: eyebrow / display title / drop-cap
// first paragraph / sequential sections with headings / pullquotes / related
// cross-links at the foot.

export default function GuideScreen() {
  const params = useLocalSearchParams<{ slug: string }>();
  const slug = params.slug;
  const api = getApi();

  const guideQuery = useQuery({
    queryKey: ["guide", slug],
    queryFn: () => api.fetchGuide(slug as string),
    enabled: Boolean(slug),
    staleTime: 60 * 60 * 1000,
  });

  const guide = guideQuery.data?.guide;

  // Record a library visit when the guide resolves. Surfaces in the
  // You-tab "Library" history filter.
  useEffect(() => {
    if (guide && slug) {
      void recordLibraryVisit({
        kind: "guide",
        slug,
        label: guide.title,
      });
    }
  }, [guide, slug]);

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

        {guideQuery.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : null}

        {guideQuery.error ? (
          <View style={styles.errorWrap}>
            <Eyebrow tone="oxblood">Couldn&apos;t load guide</Eyebrow>
            <Text
              style={[text.body, { color: colors.error, marginTop: spacing.sm }]}
            >
              {guideQuery.error instanceof Error
                ? guideQuery.error.message
                : String(guideQuery.error)}
            </Text>
          </View>
        ) : null}

        {guide ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Eyebrow tone="accent">{categoryLabel(guide.category)}</Eyebrow>
              <Text style={styles.title}>{guide.title}</Text>
              <Text style={styles.summary}>{guide.summary}</Text>
              <View style={styles.metaRow}>
                <Feather name="clock" size={11} color={colors.inkSoft} />
                <Text style={styles.metaLabel}>~{guide.readMinutes} min read</Text>
              </View>
              <GiltRule full style={{ marginTop: spacing.lg }} />
            </View>

            {guide.sections.map((section, sectionIdx) => (
              <View key={sectionIdx} style={styles.sectionWrap}>
                {section.heading ? (
                  <Text style={styles.sectionHeading}>{section.heading}</Text>
                ) : null}
                {section.body
                  .split("\n\n")
                  .filter((p) => p.trim())
                  .map((para, idx) => (
                    <Text key={idx} style={styles.paragraph}>
                      {renderInlineEm(para)}
                    </Text>
                  ))}
                {section.pullquote ? (
                  <View style={styles.pullquoteWrap}>
                    <Text style={styles.pullquoteText}>
                      &ldquo;{section.pullquote.text}&rdquo;
                    </Text>
                    <Text style={styles.pullquoteAttr}>
                      — {section.pullquote.attribution}
                    </Text>
                  </View>
                ) : null}
              </View>
            ))}

            {guide.related.length > 0 ? (
              <View style={styles.relatedWrap}>
                <Eyebrow tone="accent">Continue reading</Eyebrow>
                <GiltRule style={{ marginBottom: spacing.md }} />
                <View style={styles.relatedList}>
                  {guide.related.map((ref, idx) => (
                    <Pressable
                      key={`${ref.kind}-${ref.slug}-${idx}`}
                      onPress={() => navigateRelated(ref)}
                      style={({ pressed }) => [
                        styles.relatedRow,
                        pressed && styles.relatedRowPressed,
                      ]}
                      accessibilityRole="button"
                    >
                      <View style={styles.relatedIcon}>
                        <Feather
                          name={glyphFor(ref.kind)}
                          size={16}
                          color={colors.accent}
                        />
                      </View>
                      <View style={styles.relatedText}>
                        <Eyebrow tone="accent">{kindLabel(ref.kind)}</Eyebrow>
                        <Text style={styles.relatedLabel}>{ref.label}</Text>
                      </View>
                      <Feather
                        name="chevron-right"
                        size={16}
                        color={colors.inkSoft}
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

function navigateRelated(ref: GuideRelatedRef) {
  switch (ref.kind) {
    case "topic":
      router.push(`/topics/${ref.slug}`);
      return;
    case "guide":
      router.push(`/guides/${ref.slug}`);
      return;
    case "person":
      router.push(`/people/${ref.slug}`);
      return;
    case "work":
      router.push(`/works/${ref.slug}`);
      return;
  }
}

function glyphFor(
  kind: GuideRelatedRef["kind"],
): React.ComponentProps<typeof Feather>["name"] {
  switch (kind) {
    case "topic":
      return "layers";
    case "guide":
      return "book-open";
    case "person":
      return "user";
    case "work":
      return "book";
  }
}

function kindLabel(kind: GuideRelatedRef["kind"]): string {
  switch (kind) {
    case "topic":
      return "Topic";
    case "guide":
      return "Guide";
    case "person":
      return "Father / Saint";
    case "work":
      return "Work";
  }
}

function categoryLabel(category: string): string {
  switch (category) {
    case "first-steps":
      return "First steps";
    case "worship":
      return "Worship";
    case "sacrament":
      return "Mystery";
    case "practice":
      return "Practice";
    case "season":
      return "Season";
    case "life":
      return "Life";
    default:
      return "Guide";
  }
}

// Render plain text with *italic* segments turned into italic runs.
function renderInlineEm(input: string) {
  const parts = input.split(/(\*[^*]+\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return (
        <Text key={idx} style={styles.italic}>
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
    fontSize: 38,
    color: colors.ink,
    letterSpacing: -0.6,
    lineHeight: 44,
    marginTop: spacing.sm,
  },
  summary: {
    fontFamily: fonts.serifItalic,
    fontSize: 17,
    color: colors.inkMuted,
    lineHeight: 26,
    marginTop: spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  metaLabel: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.inkSoft,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    fontWeight: "600",
  },

  sectionWrap: { gap: spacing.md },
  sectionHeading: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 22,
    color: colors.ink,
    letterSpacing: -0.3,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  paragraph: {
    fontFamily: fonts.serif,
    fontSize: 17,
    lineHeight: 28,
    color: colors.ink,
    letterSpacing: 0.05,
  },
  italic: {
    fontFamily: fonts.serifItalic,
    fontSize: 17,
  },

  pullquoteWrap: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderLeftWidth: 2,
    borderLeftColor: colors.lineGilt,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  pullquoteText: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 20,
    lineHeight: 28,
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

  relatedWrap: { gap: spacing.xs, marginTop: spacing.lg },
  relatedList: { marginTop: spacing.md, gap: spacing.xs },
  relatedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  relatedRowPressed: {
    backgroundColor: "rgba(212, 168, 87, 0.05)",
    borderRadius: radii.card,
  },
  relatedIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.card,
    backgroundColor: "rgba(212, 168, 87, 0.08)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
    alignItems: "center",
    justifyContent: "center",
  },
  relatedText: { flex: 1, gap: 2 },
  relatedLabel: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.ink,
    letterSpacing: -0.1,
    lineHeight: 22,
  },
});

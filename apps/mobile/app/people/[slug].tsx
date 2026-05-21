import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
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

// Person detail screen — stack route pushed from the Library tab when a
// row is tapped. Shows the saint/father's icon, name, kind, era, traditions
// (as pills), and extendedSummary (split into paragraphs).
//
// Today this re-uses the /api/library/people response (cached from the
// Library list) and finds the requested person by slug. That avoids a
// second fetch for instant transitions, at the cost of "the full list
// must have loaded first." If you deep-link directly to a person without
// hitting Library first, React Query will trigger the list fetch on
// mount; it's just one extra round-trip.
//
// Works grid is a follow-up — needs a per-person works endpoint.

export default function PersonDetailScreen() {
  const params = useLocalSearchParams<{ slug: string }>();
  const slug = params.slug;

  const api = getApi();
  const peopleQuery = useQuery({
    queryKey: ["library-people"],
    queryFn: () => api.fetchLibraryPeople(),
    staleTime: 60 * 60 * 1000,
  });

  const person = useMemo(
    () => peopleQuery.data?.people.find((p) => p.slug === slug),
    [peopleQuery.data, slug],
  );

  const bioParagraphs = useMemo(() => {
    if (!person?.extendedSummary) return [];
    return person.extendedSummary.split("\n\n").filter((p) => p.trim().length > 0);
  }, [person?.extendedSummary]);

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
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {peopleQuery.isLoading && !person ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : null}

          {!peopleQuery.isLoading && !person ? (
            <View style={styles.emptyCard}>
              <Text style={text.eyebrow}>Not found</Text>
              <Text style={text.body}>
                We don&apos;t have an entry for &ldquo;{slug}&rdquo; yet.
              </Text>
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => [pressed && { opacity: 0.6 }]}
              >
                <Text style={styles.backLink}>← Back to Library</Text>
              </Pressable>
            </View>
          ) : null}

          {person ? (
            <>
              {person.icon ? (
                <View style={styles.iconWrap}>
                  <Image
                    source={{ uri: person.icon.src }}
                    style={styles.iconImage}
                    contentFit="contain"
                    transition={200}
                    accessibilityLabel={person.icon.alt}
                  />
                </View>
              ) : null}

              <View style={styles.titleBlock}>
                <Text style={styles.eyebrow}>{person.kind}</Text>
                <Text style={styles.name}>
                  {person.honorific ? `${person.honorific} ` : ""}
                  {person.name}
                </Text>
                <Text style={styles.era}>{person.eraLabel}</Text>
              </View>

              {person.summary ? (
                <Text style={styles.summary}>{person.summary}</Text>
              ) : null}

              {person.traditions.length > 0 ? (
                <View style={styles.pillRow}>
                  {person.traditions.map((tradition) => (
                    <Pill key={tradition} variant="subtle">
                      {tradition}
                    </Pill>
                  ))}
                </View>
              ) : null}

              {person.feastDayLabel ? (
                <View style={styles.factBlock}>
                  <Text style={styles.factLabel}>Feast day</Text>
                  <Text style={styles.factValue}>{person.feastDayLabel}</Text>
                </View>
              ) : null}

              {bioParagraphs.length > 0 ? (
                <View style={styles.bioBlock}>
                  <Text style={styles.factLabel}>Life</Text>
                  {bioParagraphs.map((paragraph, index) => (
                    <Text key={index} style={styles.bioParagraph}>
                      {paragraph}
                    </Text>
                  ))}
                </View>
              ) : null}

              {person.icon?.attribution ? (
                <Text style={styles.attribution}>
                  Icon: {person.icon.attribution}
                </Text>
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

  loading: { paddingVertical: spacing["4xl"], alignItems: "center" },
  emptyCard: {
    paddingVertical: spacing["3xl"],
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  backLink: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: "600",
    paddingTop: spacing.sm,
  },

  iconWrap: { alignItems: "center", paddingTop: spacing.md },
  iconImage: {
    width: 220,
    height: 280,
    borderRadius: radii.large,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },

  titleBlock: {
    gap: spacing.xs,
    alignItems: "center",
  },
  eyebrow: {
    fontSize: 10.4,
    fontWeight: "500",
    color: colors.inkSoft,
    letterSpacing: 2.4,
    textTransform: "uppercase",
  },
  name: {
    fontFamily: fonts.serif,
    fontSize: 30,
    color: colors.ink,
    letterSpacing: -0.4,
    lineHeight: 36,
    textAlign: "center",
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
    textAlign: "center",
  },

  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    justifyContent: "center",
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

  bioBlock: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  bioParagraph: {
    fontSize: 15,
    lineHeight: 26,
    color: colors.inkMuted,
  },

  attribution: {
    fontSize: 11,
    color: colors.inkSoft,
    textAlign: "center",
    fontStyle: "italic",
    paddingTop: spacing.md,
  },
});

import Feather from "@expo/vector-icons/Feather";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Card,
  Eyebrow,
  GiltRule,
  SectionHeader,
} from "@/components/theosis/primitives";
import {
  colors,
  elevation,
  fonts,
  radii,
  spacing,
} from "@/constants/theosis-theme";
import { getApi } from "@/lib/api";
import {
  getFavoritePersonSlugs,
  getProfilePrefs,
  recordLibraryVisit,
  toggleFavoritePerson,
  updateProfilePrefs,
} from "@/lib/preferences";

// Person detail — the saint's library entry. Composed like a magazine
// profile: edge-bleed portrait, dramatic italic name overlay, then an
// editorial body with life, traditions, feast day, and works.
//
// Re-uses /api/library/people (cached) so transitions from the Library
// list are instant. If you deep-link directly, the list fetch triggers
// on mount.

export default function PersonDetailScreen() {
  const params = useLocalSearchParams<{ slug: string }>();
  const slug = params.slug;

  const api = getApi();
  const peopleQuery = useQuery({
    queryKey: ["library-people"],
    queryFn: () => api.fetchLibraryPeople(),
    staleTime: 60 * 60 * 1000,
  });

  const libraryQuery = useQuery({
    queryKey: ["library-catalog"],
    queryFn: () => api.fetchLibraryCatalog(),
    staleTime: 60 * 60 * 1000,
  });

  const person = useMemo(
    () => peopleQuery.data?.people.find((p) => p.slug === slug),
    [peopleQuery.data, slug],
  );

  const works = useMemo(() => {
    if (!person || !libraryQuery.data) return [];
    // Only surface works that have long-form chapters. Commentary-only
    // "works" (HCF source titles that never landed a chapter body) are
    // still useful for commentary attribution but shouldn't show up in
    // a person's bibliography — they'd render as dead-end cards.
    const byWork = libraryQuery.data.index?.byWork;
    return libraryQuery.data.works
      .filter((w) => w.personId === person.id && byWork?.[w.id] != null)
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [person, libraryQuery.data]);

  const bioParagraphs = useMemo(() => {
    if (!person?.extendedSummary) return [];
    return person.extendedSummary
      .split("\n\n")
      .filter((p) => p.trim().length > 0);
  }, [person?.extendedSummary]);

  const displayName = person
    ? person.honorific
      ? `${person.honorific} ${person.name.split(",")[0]}`
      : person.name.split(",")[0]
    : "";

  // Record a library visit once the person row is loaded — drives the
  // "where I've been reading" feed in the You tab.
  useEffect(() => {
    if (person && slug) {
      void recordLibraryVisit({
        kind: "person",
        slug,
        label: displayName,
      });
    }
  }, [person, slug, displayName]);

  // Patron + favorite affordances. Both read from prefs on focus so
  // returning from settings or another person reflects updated state.
  const [patronSlug, setPatronSlug] = useState<string | undefined>(undefined);
  const [favorites, setFavorites] = useState<string[]>([]);
  useFocusEffect(
    useCallback(() => {
      let canceled = false;
      Promise.all([getProfilePrefs(), getFavoritePersonSlugs()]).then(
        ([prefs, favs]) => {
          if (canceled) return;
          setPatronSlug(prefs.patronSaintSlug);
          setFavorites(favs);
        },
      );
      return () => {
        canceled = true;
      };
    }, []),
  );
  const isMyPatron = Boolean(slug) && patronSlug === slug;
  const isFavorite = Boolean(slug) && favorites.includes(slug);

  async function handleSetPatron() {
    if (!slug) return;
    await updateProfilePrefs({ patronSaintSlug: slug });
    setPatronSlug(slug);
  }
  async function handleUnsetPatron() {
    await updateProfilePrefs({ patronSaintSlug: undefined });
    setPatronSlug(undefined);
  }
  async function handleToggleFavorite() {
    if (!slug) return;
    const next = await toggleFavoritePerson(slug);
    setFavorites(next);
  }

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
          // Solid header (not transparent) so the portrait below it
          // isn't clipped by the back button area. The header keeps the
          // page bg color so the visual line still reads as continuous.
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
          locations={[0, 0.4, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
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
            <View style={styles.notFound}>
              <Eyebrow tone="oxblood">Not found</Eyebrow>
              <Text style={styles.notFoundTitle}>No library entry</Text>
              <Text style={styles.notFoundBody}>
                We don&apos;t have an entry for &ldquo;{slug}&rdquo; yet.
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
                <Text style={styles.backCtaLabel}>Back to Library</Text>
              </Pressable>
            </View>
          ) : null}

          {person ? (
            <>
              {/* Editorial portrait — edge-bleed icon with gradient overlay
                  + the saint's name laid over the bottom in italic
                  display. Reads like a magazine profile cover. */}
              <View style={[styles.portrait, elevation.giltGlow]}>
                {person.icon ? (
                  <Image
                    source={{ uri: person.icon.src }}
                    style={styles.portraitImage}
                    contentFit="cover"
                    transition={240}
                    accessibilityLabel={person.icon.alt}
                  />
                ) : (
                  <View style={styles.portraitFallback}>
                    <Text style={styles.portraitFallbackLetter}>
                      {person.name.charAt(0)}
                    </Text>
                  </View>
                )}
                <LinearGradient
                  colors={[
                    "rgba(10, 9, 8, 0.05)",
                    "rgba(10, 9, 8, 0.55)",
                    "rgba(10, 9, 8, 0.95)",
                  ]}
                  locations={[0.3, 0.65, 1]}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />
                <View style={styles.portraitOverlay}>
                  <Eyebrow tone="oxblood">{person.kind}</Eyebrow>
                  <Text style={styles.portraitName}>{displayName}</Text>
                  <Text style={styles.portraitEra}>{person.eraLabel}</Text>
                </View>
              </View>

              {/* Action row — Patron + Favorite. Sits under the portrait
                  before the lede so the actions are easy to find. Both
                  toggle their saved state with a quiet visual flip
                  (filled badge when active). */}
              <View style={styles.actionRow}>
                {isMyPatron ? (
                  <Pressable
                    onPress={handleUnsetPatron}
                    style={({ pressed }) => [
                      styles.actionPill,
                      styles.actionPillActive,
                      pressed && { opacity: 0.7 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Your patron — tap to unset"
                  >
                    <Feather
                      name="award"
                      size={13}
                      color={colors.background}
                    />
                    <Text style={[styles.actionPillLabel, styles.actionPillLabelActive]}>
                      Your patron
                    </Text>
                    <Feather
                      name="x"
                      size={11}
                      color={colors.background}
                      style={{ opacity: 0.7 }}
                    />
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={handleSetPatron}
                    style={({ pressed }) => [
                      styles.actionPill,
                      pressed && { opacity: 0.7 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Set as my patron"
                  >
                    <Feather name="award" size={13} color={colors.accent} />
                    <Text style={styles.actionPillLabel}>Set as patron</Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={handleToggleFavorite}
                  style={({ pressed }) => [
                    styles.actionPill,
                    isFavorite && styles.actionPillFavorite,
                    pressed && { opacity: 0.7 },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isFavorite }}
                  accessibilityLabel={
                    isFavorite ? "Remove from favorites" : "Add to favorites"
                  }
                >
                  <Feather
                    name="heart"
                    size={13}
                    color={isFavorite ? colors.oxbloodInk : colors.inkMuted}
                  />
                  <Text
                    style={[
                      styles.actionPillLabel,
                      isFavorite && styles.actionPillLabelFavorite,
                    ]}
                  >
                    {isFavorite ? "Favorited" : "Favorite"}
                  </Text>
                </Pressable>
              </View>

              {/* Lede — short summary in serif body */}
              {person.summary ? (
                <View style={styles.lede}>
                  <Text style={styles.ledeText}>{person.summary}</Text>
                  <GiltRule style={{ marginTop: spacing.lg }} />
                </View>
              ) : null}

              {/* Quick facts row — feast day + traditions */}
              {(person.feastDayLabel || person.traditions.length > 0) ? (
                <View style={styles.factsRow}>
                  {person.feastDayLabel ? (
                    <View style={styles.factTile}>
                      <Eyebrow tone="accent">Feast Day</Eyebrow>
                      <Text style={styles.factValue}>
                        {person.feastDayLabel}
                      </Text>
                    </View>
                  ) : null}
                  {person.traditions.length > 0 ? (
                    <View style={[styles.factTile, { flex: 1.4 }]}>
                      <Eyebrow tone="accent">Tradition</Eyebrow>
                      <View style={styles.traditionRow}>
                        {person.traditions.map((tradition) => (
                          <Text key={tradition} style={styles.traditionChip}>
                            {tradition}
                          </Text>
                        ))}
                      </View>
                    </View>
                  ) : null}
                </View>
              ) : null}

              {/* Life — bio paragraphs as editorial body */}
              {bioParagraphs.length > 0 ? (
                <View style={styles.cardSlot}>
                  <Card>
                    <SectionHeader eyebrow="Synaxis" title="The Life" rule />
                    <View style={styles.bioParagraphs}>
                      {bioParagraphs.map((paragraph, index) => (
                        <Text key={index} style={styles.bioParagraph}>
                          {paragraph}
                        </Text>
                      ))}
                    </View>
                  </Card>
                </View>
              ) : null}

              {/* Works — flat alphabetical list (no type grouping). Each
                  row links to /works/<slug>. */}
              {works.length > 0 ? (
                <View style={styles.worksSection}>
                  <SectionHeader
                    eyebrow="Bibliography"
                    title="Works in the library"
                    rule
                  />
                  {works.map((work, idx) => (
                    <Pressable
                      key={work.id}
                      onPress={() => router.push(`/works/${work.slug}`)}
                      style={({ pressed }) => [
                        styles.workRow,
                        pressed && { opacity: 0.6 },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${work.title}`}
                    >
                      <Text style={styles.workIndex}>
                        {String(idx + 1).padStart(2, "0")}
                      </Text>
                      <View style={styles.workText}>
                        <Text style={styles.workTitle} numberOfLines={2}>
                          {work.title}
                        </Text>
                        {work.summary ? (
                          <Text style={styles.workSummary} numberOfLines={2}>
                            {work.summary}
                          </Text>
                        ) : null}
                        <Text style={styles.workMeta}>
                          {work.workType} · {work.lengthLabel}
                        </Text>
                      </View>
                      <Feather
                        name="chevron-right"
                        size={14}
                        color={colors.inkSoft}
                      />
                    </Pressable>
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
      </View>
    </>
  );
}

const PORTRAIT_HEIGHT = 460;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: {
    paddingBottom: spacing["4xl"] + spacing["2xl"],
  },

  loading: {
    paddingVertical: spacing["6xl"],
    alignItems: "center",
  },

  notFound: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing["6xl"],
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

  // Edge-bleed portrait
  portrait: {
    height: PORTRAIT_HEIGHT,
    width: "100%",
    overflow: "hidden",
    borderBottomLeftRadius: radii.xl,
    borderBottomRightRadius: radii.xl,
  },
  portraitImage: { width: "100%", height: "100%" },
  portraitFallback: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.surfaceStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  portraitFallbackLetter: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 140,
    color: colors.accent,
  },
  portraitOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.xs,
  },
  portraitName: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 40,
    color: colors.ink,
    letterSpacing: -0.6,
    lineHeight: 44,
    marginTop: spacing.xs,
  },
  portraitEra: {
    fontFamily: fonts.serifItalic,
    fontSize: 14,
    color: colors.inkMuted,
  },

  // Action row — patron + favorite under the portrait
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  actionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
    backgroundColor: "rgba(212, 168, 87, 0.08)",
  },
  actionPillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  actionPillFavorite: {
    backgroundColor: "rgba(139, 58, 58, 0.08)",
    borderColor: "rgba(139, 58, 58, 0.3)",
  },
  actionPillLabel: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  actionPillLabelActive: { color: colors.background },
  actionPillLabelFavorite: { color: colors.oxbloodInk },

  // Lede
  lede: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  ledeText: {
    fontFamily: fonts.serif,
    fontSize: 17,
    lineHeight: 28,
    color: colors.ink,
  },

  // Quick facts
  factsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  factTile: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  factValue: {
    fontFamily: fonts.serif,
    fontSize: 17,
    color: colors.ink,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  traditionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  traditionChip: {
    fontFamily: fonts.serif,
    fontSize: 14,
    color: colors.ink,
    letterSpacing: -0.1,
    lineHeight: 20,
  },

  // Bio
  bioParagraphs: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  bioParagraph: {
    fontFamily: fonts.serif,
    fontSize: 16,
    lineHeight: 28,
    color: colors.inkMuted,
  },

  // Card placement — Cards have their own padding so wrap them in
  // padding on the parent.
  worksSection: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  workRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  workIndex: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 22,
    color: colors.accent,
    letterSpacing: -0.5,
    opacity: 0.85,
    width: 32,
    paddingTop: 2,
  },
  workText: { flex: 1, gap: 4 },
  workTitle: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 17,
    color: colors.ink,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  workSummary: {
    fontFamily: fonts.serif,
    fontSize: 13,
    lineHeight: 20,
    color: colors.inkMuted,
  },
  workMeta: {
    fontFamily: fonts.sans,
    fontSize: 10.5,
    fontWeight: "700",
    color: colors.inkSoft,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    marginTop: 2,
  },

  // Cards used by Card primitive — wrap in horizontal padding so they
  // align with the rest of the editorial body (the portrait above
  // deliberately bleeds edge-to-edge, but the cards should not).
  cardSlot: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },

  attribution: {
    fontFamily: fonts.serifItalic,
    fontSize: 11,
    color: colors.inkSoft,
    textAlign: "center",
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
});

import { SignedIn, SignedOut, useUser } from "@clerk/clerk-expo";
import Feather from "@expo/vector-icons/Feather";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  Card,
  DisplayNumeral,
  Eyebrow,
  GiltRule,
  Halo,
  SectionHeader,
  Wordmark,
} from "@/components/theosis/primitives";
import { ProfileDrawer } from "@/components/theosis/profile-drawer";
import { colors, fonts, radii, spacing, text } from "@/constants/theosis-theme";
import {
  type ProfilePrefs,
  type ReadingListItem,
  type SavedCommentary,
  type SavedDailyReading,
  type SavedVerse,
  getProfilePrefs,
  getReadingList,
  getSavedCommentary,
  getSavedDailyReadings,
  getSavedVerses,
  recordActivityToday,
} from "@/lib/preferences";
import { usePatronIcon } from "@/lib/use-patron-icon";

// You — the personal corner. Identity hero with halo avatar, two display
// numerals (streak + saved), an editorial activity timeline, and quiet
// navigation to settings & practice.

type ActivityTab = "all" | "saved" | "reading" | "commentary" | "daily";

export default function YouScreen() {
  const [prefs, setPrefs] = useState<ProfilePrefs>({});
  const patronIcon = usePatronIcon(prefs.patronSaintSlug);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [streak, setStreak] = useState(0);
  const [saved, setSaved] = useState<SavedVerse[]>([]);
  const [readingList, setReadingList] = useState<ReadingListItem[]>([]);
  const [savedCommentary, setSavedCommentary] = useState<SavedCommentary[]>([]);
  const [savedDaily, setSavedDaily] = useState<SavedDailyReading[]>([]);
  const [activityTab, setActivityTab] = useState<ActivityTab>("all");

  useEffect(() => {
    let canceled = false;
    Promise.all([
      recordActivityToday(),
      getProfilePrefs(),
      getSavedVerses(),
      getReadingList(),
      getSavedCommentary(),
      getSavedDailyReadings(),
    ]).then(
      ([activity, profile, savedVerses, list, commentary, daily]) => {
        if (canceled) return;
        setStreak(activity.streak);
        setPrefs(profile);
        setSaved(savedVerses);
        setReadingList(list);
        setSavedCommentary(commentary);
        setSavedDaily(daily);
      },
    );
    return () => {
      canceled = true;
    };
  }, []);

  // Identity: Clerk first name when signed in, else local prefs displayName,
  // else "Friend". Initial letter for the halo avatar.
  const { user } = useUser();
  const clerkDisplayName =
    user?.firstName ??
    user?.fullName ??
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ??
    null;
  const displayName =
    clerkDisplayName?.trim() || prefs.displayName?.trim() || "Friend";
  const initial = displayName.charAt(0).toUpperCase();
  const statusLabel =
    prefs.status === "christian"
      ? "Orthodox Christian"
      : prefs.status === "catechumen"
        ? "Catechumen"
        : prefs.status === "inquirer"
          ? "Inquirer"
          : null;

  // Map verseKey "matthew.5.3" back into the explore deep-link so a
  // tap on a saved commentary item lands at the verse in the reader.
  function commentaryHref(verseKey: string): string {
    const parts = verseKey.split(".");
    if (parts.length !== 3) return "/explore";
    const [book, chapter, verse] = parts;
    return `/explore?book=${book}&chapter=${chapter}&highlight=${verse}`;
  }

  const activityItems: {
    id: string;
    kind: "saved" | "reading" | "commentary";
    label: string;
    sub?: string;
    href?: string;
  }[] = [
    ...saved.map((v) => ({
      id: `s-${v.id}`,
      kind: "saved" as const,
      label: `${capitalize(v.book)} ${v.chapter}:${v.verse}`,
      sub: v.preview,
      href: `/explore?translation=${v.translation}&book=${v.book}&chapter=${v.chapter}&highlight=${v.verse}`,
    })),
    ...readingList.map((r) => ({
      id: `r-${r.id}`,
      kind: "reading" as const,
      label: r.title,
      sub: "Reading list",
      href: `/works/${r.workSlug}`,
    })),
    ...savedCommentary.map((c) => ({
      id: `c-${c.id}`,
      kind: "commentary" as const,
      label: `${c.personName} on ${formatVerseKey(c.verseKey)}`,
      sub: c.workTitle
        ? `${c.workTitle} — ${c.excerpt.slice(0, 80)}…`
        : `${c.excerpt.slice(0, 80)}…`,
      href: commentaryHref(c.verseKey),
    })),
    // Saved Daily readings — let users scroll back to a day they
    // bookmarked. We don't yet have a per-day Daily route, so the link
    // is decorative for now; tapping does nothing harmful.
    ...savedDaily.map((d) => ({
      id: `d-${d.isoDate}`,
      kind: "daily" as const,
      label: new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }).format(new Date(`${d.isoDate}T00:00:00`)),
      sub: `Saved daily — ${d.isoDate}`,
      href: undefined as string | undefined,
    })),
  ].filter((item) => activityTab === "all" || item.kind === activityTab);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <LinearGradient
        colors={[
          "rgba(212, 168, 87, 0.13)",
          "rgba(139, 58, 58, 0.04)",
          colors.background,
        ]}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.masthead}>
        <Wordmark size={18} subline="Profile" />
        <Pressable
          onPress={() => setDrawerOpen(true)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
        >
          <Halo size={40}>
            {patronIcon ? (
              <Image
                source={{ uri: patronIcon.src }}
                accessibilityLabel={patronIcon.alt}
                style={styles.avatarImage}
                contentFit="cover"
              />
            ) : (
              <Text style={styles.mastheadAvatarLetter}>{initial}</Text>
            )}
          </Halo>
        </Pressable>
      </View>
      <GiltRule full style={{ marginHorizontal: spacing.xl }} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Identity hero */}
        <View style={styles.identityHero}>
          <Halo size={96} glow>
            {patronIcon ? (
              <Image
                source={{ uri: patronIcon.src }}
                accessibilityLabel={patronIcon.alt}
                style={styles.avatarImage}
                contentFit="cover"
              />
            ) : (
              <Text style={styles.avatarLetter}>{initial}</Text>
            )}
          </Halo>
          <Text style={styles.displayName}>{displayName}</Text>
          <SignedOut>
            <Pressable
              onPress={() => router.push("/auth-debug")}
              accessibilityRole="button"
              accessibilityLabel="Sign in to sync"
              style={({ pressed }) => [
                styles.signInCta,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Feather name="log-in" size={13} color={colors.accent} />
              <Text style={styles.signInCtaLabel}>Sign in to sync</Text>
            </Pressable>
          </SignedOut>
          {statusLabel ? (
            <View style={styles.statusPill}>
              <Text style={styles.statusPillLabel}>{statusLabel}</Text>
            </View>
          ) : null}
          {prefs.parish ? (
            <View style={styles.parishRow}>
              <Feather name="map-pin" size={11} color={colors.inkSoft} />
              <Text style={styles.parish}>{prefs.parish}</Text>
            </View>
          ) : (
            <Pressable
              onPress={() => router.push("/parishes")}
              hitSlop={6}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.parishCta,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Feather name="map-pin" size={11} color={colors.accent} />
              <Text style={styles.parishCtaLabel}>Find your parish</Text>
            </Pressable>
          )}
        </View>

        {/* Numerical stats — display italic numerals */}
        <View style={styles.statRow}>
          <DisplayNumeral
            value={streak}
            label="Day streak"
            size={56}
            tone="accent"
          />
          <View style={styles.statDivider} />
          <DisplayNumeral
            value={saved.length}
            label="Saved verses"
            size={56}
          />
        </View>

        <GiltRule full />

        {/* Practice tiles — gilt-edged composed row */}
        <View style={styles.practiceRow}>
          <PracticeTile
            label="Prayer"
            sub="Rule"
            glyph="feather"
            onPress={() => router.push("/prayer")}
          />
          <PracticeTile
            label="Library"
            sub="Fathers"
            glyph="bookmark"
            onPress={() => router.push("/library")}
          />
          <PracticeTile
            label="Bible"
            sub="Read"
            glyph="book-open"
            onPress={() => router.push("/explore")}
          />
          {prefs.patronSaintSlug ? (
            <PracticeTile
              label="Patron"
              sub={capitalize(prefs.patronSaintSlug).split(" ").slice(0, 1).join("")}
              glyph="award"
              onPress={() =>
                router.push(`/people/${prefs.patronSaintSlug}` as never)
              }
            />
          ) : (
            <PracticeTile
              label="Settings"
              sub="Configure"
              glyph="settings"
              onPress={() => router.push("/settings")}
            />
          )}
        </View>

        {/* Find-a-parish card — full-width tappable. Reaches the parishes
            screen via location permission flow (or manual ZIP fallback). */}
        <Pressable
          onPress={() => router.push("/parishes")}
          style={({ pressed }) => [
            styles.findParishCard,
            pressed && { opacity: 0.85 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Find an Orthodox parish near you"
        >
          <View style={styles.findParishIcon}>
            <Feather name="map-pin" size={20} color={colors.accent} />
          </View>
          <View style={styles.findParishText}>
            <Text style={styles.findParishLabel}>Find a parish near you</Text>
            <Text style={styles.findParishSub}>
              Search Orthodox parishes across the United States
            </Text>
          </View>
          <Feather name="chevron-right" size={16} color={colors.inkSoft} />
        </Pressable>

        {/* Activity */}
        <View style={styles.activityWrap}>
          <SectionHeader eyebrow="Recently" title="Activity" rule />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activityTabs}
          >
            {(["all", "saved", "reading", "commentary", "daily"] as ActivityTab[]).map((tab) => {
              const active = tab === activityTab;
              const label =
                tab === "all"
                  ? "All"
                  : tab === "saved"
                    ? "Saved"
                    : tab === "reading"
                      ? "Reading"
                      : tab === "commentary"
                        ? "Commentary"
                        : "Daily";
              return (
                <Pressable
                  key={tab}
                  onPress={() => setActivityTab(tab)}
                  style={({ pressed }) => [
                    styles.activityFilter,
                    active && styles.activityFilterActive,
                    pressed && !active && { opacity: 0.7 },
                  ]}
                  accessibilityRole="button"
                >
                  <Text
                    style={[
                      styles.activityFilterLabel,
                      active && styles.activityFilterLabelActive,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.activityList}>
            {activityItems.length === 0 ? (
              <Text style={styles.emptyActivity}>
                Verses you save and works you queue appear here.
              </Text>
            ) : (
              activityItems.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={
                    item.href
                      ? () => router.push(item.href as never)
                      : undefined
                  }
                  style={({ pressed }) => [
                    styles.activityRow,
                    pressed && item.href && { opacity: 0.7 },
                  ]}
                  accessibilityRole={item.href ? "button" : "text"}
                >
                  <Feather
                    name={
                      item.kind === "saved"
                        ? "bookmark"
                        : item.kind === "commentary"
                          ? "message-square"
                          : item.kind === "daily"
                            ? "calendar"
                            : "book-open"
                    }
                    size={14}
                    color={colors.accent}
                    style={styles.activityGlyph}
                  />
                  <View style={styles.activityText}>
                    <Text style={styles.activityLabel} numberOfLines={1}>
                      {item.label}
                    </Text>
                    {item.sub ? (
                      <Text style={styles.activitySub} numberOfLines={1}>
                        {item.sub}
                      </Text>
                    ) : null}
                  </View>
                  {item.href ? (
                    <Feather
                      name="chevron-right"
                      size={14}
                      color={colors.inkSoft}
                    />
                  ) : null}
                </Pressable>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      <ProfileDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        profile={prefs}
        streak={streak}
        savedCount={saved.length}
      />
    </SafeAreaView>
  );
}

function capitalize(slug: string) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// "matthew.5.3" → "Matthew 5:3" for activity-feed labels.
function formatVerseKey(verseKey: string): string {
  const parts = verseKey.split(".");
  if (parts.length !== 3) return verseKey;
  const [book, chapter, verse] = parts;
  return `${capitalize(book)} ${chapter}:${verse}`;
}

function PracticeTile({
  label,
  sub,
  glyph,
  onPress,
}: {
  label: string;
  sub: string;
  glyph: React.ComponentProps<typeof Feather>["name"];
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.practiceTile,
        pressed && { opacity: 0.85 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Feather name={glyph} size={18} color={colors.accent} />
      <Text style={styles.practiceTileLabel}>{label}</Text>
      <Text style={styles.practiceTileSub}>{sub}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  masthead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing["6xl"] + spacing.lg,
    gap: spacing.xl,
  },

  // Identity
  identityHero: { alignItems: "center", gap: spacing.md },
  avatarLetter: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 44,
    color: colors.accent,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  mastheadAvatarLetter: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 18,
    color: colors.accent,
  },
  displayName: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 36,
    color: colors.ink,
    letterSpacing: -0.5,
    textAlign: "center",
  },
  statusPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: "rgba(212, 168, 87, 0.10)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
  },
  statusPillLabel: {
    fontFamily: fonts.sans,
    fontSize: 10,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 2.4,
    textTransform: "uppercase",
  },
  signInCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
  },
  signInCtaLabel: {
    fontFamily: fonts.serif,
    fontSize: 13,
    color: colors.accent,
    fontWeight: "600",
  },
  parishRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  parish: {
    fontFamily: fonts.serifItalic,
    fontSize: 13,
    color: colors.inkMuted,
  },
  parishCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: spacing.xs,
  },
  parishCtaLabel: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },

  statRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    paddingVertical: spacing.md,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 60,
    backgroundColor: colors.lineGilt,
  },

  // Practice tiles
  practiceRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  practiceTile: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
    backgroundColor: "rgba(212, 168, 87, 0.04)",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.md,
  },
  practiceTileLabel: {
    fontFamily: fonts.serif,
    fontSize: 14,
    color: colors.ink,
    letterSpacing: -0.1,
  },
  practiceTileSub: {
    fontFamily: fonts.sans,
    fontSize: 9.5,
    fontWeight: "600",
    color: colors.inkSoft,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },

  // Find-a-parish card
  findParishCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
    backgroundColor: "rgba(212, 168, 87, 0.04)",
  },
  findParishIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(212, 168, 87, 0.10)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
  },
  findParishText: { flex: 1, gap: 2 },
  findParishLabel: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.ink,
    letterSpacing: -0.1,
  },
  findParishSub: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.inkMuted,
    lineHeight: 16,
  },

  // Activity
  activityWrap: { gap: spacing.md },
  activityTabs: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  activityFilter: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: "transparent",
  },
  activityFilterActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  activityFilterLabel: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: "700",
    color: colors.inkMuted,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  activityFilterLabelActive: { color: colors.background },

  activityList: { gap: spacing.sm },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  activityGlyph: { width: 18 },
  activityText: { flex: 1, gap: 2 },
  activityLabel: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.ink,
    letterSpacing: -0.1,
  },
  activitySub: {
    fontFamily: fonts.serifItalic,
    fontSize: 12,
    color: colors.inkSoft,
  },
  emptyActivity: {
    fontFamily: fonts.serifItalic,
    fontSize: 14,
    color: colors.inkSoft,
    textAlign: "center",
    paddingVertical: spacing["2xl"],
  },
});

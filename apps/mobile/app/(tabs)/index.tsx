import Feather from "@expo/vector-icons/Feather";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import DraggableFlatList, {
  type RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import type { DailyResponse } from "@theosis/core";

import {
  Card,
  Eyebrow,
  GiltRule,
  Halo,
  SectionHeader,
  Wordmark,
} from "@/components/theosis/primitives";
import { ProfileDrawer } from "@/components/theosis/profile-drawer";
import {
  colors,
  elevation,
  fonts,
  radii,
  spacing,
  text,
} from "@/constants/theosis-theme";
import { getApi } from "@/lib/api";
import {
  type DailyCardKey,
  DEFAULT_DAILY_CARD_ORDER,
  getDailyCardOrder,
  getProfilePrefs,
  getSavedVerses,
  recordActivityToday,
  setDailyCardOrder,
} from "@/lib/preferences";

// Resolve a fast label for the day. The API supplies one during Lent,
// the Apostles' Fast, Dormition Fast, etc. For ordinary time we fall
// back to the weekly rule — Wednesday + Friday are the standing fast
// days; all other days are "Fast Free." So every Daily page has a
// fast status visible, not just feast/season days.
function resolveFastLabel(
  isoDate: string,
  providedLabel: string | undefined,
): { label: string; isFastFree: boolean } {
  if (providedLabel) return { label: providedLabel, isFastFree: false };
  const d = new Date(`${isoDate}T00:00:00Z`);
  const dow = d.getUTCDay(); // 0=Sun … 3=Wed, 5=Fri, 6=Sat
  if (dow === 3) return { label: "Wednesday Fast", isFastFree: false };
  if (dow === 5) return { label: "Friday Fast", isFastFree: false };
  return { label: "Fast Free", isFastFree: true };
}

// Order readings by liturgical priority — Gospel first (the day's
// climactic word), then Apostle/Epistle, then OT/Psalms last. The API
// returns them in arbitrary order; the user wants the Gospel-first
// reading experience.
function readingPriority(label: string): number {
  const l = label.toLowerCase();
  if (l.includes("gospel")) return 0;
  if (l.includes("apostle") || l.includes("epistle")) return 1;
  if (l.includes("ot") || l.includes("old testament") || l.includes("psalm"))
    return 3;
  return 2;
}

// Daily home — the icon corner. Masthead at top (wordmark / halo avatar),
// a single hero card carrying the day's mood (feast or verse), editorial
// section blocks below. Every card is reorderable via long-press drag,
// with a visible hint at the bottom of the list so the affordance is
// discoverable.
//
// Date is always *today*. The date-picker / week-strip / prev-next was
// removed because it was confusing — the Daily tab is about *this day's*
// liturgical life; if you want a different day, the calendar lives
// elsewhere.

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

// Format the date as a magazine-style masthead label: "Sunday · May 17"
// — weekday and short month/day only.
function formatMastheadDate(isoDate: string): string {
  const date = new Date(isoDate);
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: "UTC",
  }).format(date);
  const monthDay = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
  return `${weekday} · ${monthDay}`;
}

export default function DailyScreen() {
  const api = getApi();
  const insets = useSafeAreaInsets();
  // Floating tab bar height = capsule (52) + wrapper bottom padding
  // (insets.bottom on notched devices, spacing.md elsewhere) + shadow
  // bleed. Plus the cardWrap.marginBottom of the last DraggableFlatList
  // item (spacing.lg = 16). Add a big breathing buffer so the hymns
  // card is comfortably above the capsule, never touching it.
  const listBottomPadding =
    spacing["6xl"] + (insets.bottom > 0 ? insets.bottom : spacing.md) + spacing["3xl"];
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cardOrder, setCardOrderState] = useState<DailyCardKey[]>(
    DEFAULT_DAILY_CARD_ORDER,
  );
  const [profile, setProfile] = useState<{ displayName?: string }>({});
  const [streak, setStreak] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [reorderHinted, setReorderHinted] = useState(false);

  const { data, error, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["daily", "today"],
    queryFn: () => api.fetchDaily(),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    let canceled = false;
    Promise.all([
      getDailyCardOrder(),
      getProfilePrefs(),
      recordActivityToday(),
      getSavedVerses(),
    ]).then(([order, prof, activity, saved]) => {
      if (canceled) return;
      setCardOrderState(order);
      setProfile(prof);
      setStreak(activity.streak);
      setSavedCount(saved.length);
    });
    return () => {
      canceled = true;
    };
  }, []);

  const onReorder = useCallback((next: DailyCardKey[]) => {
    setCardOrderState(next);
    setDailyCardOrder(next);
    setReorderHinted(true);
  }, []);

  const hasFeast = Boolean(data?.daily.feastLabel || data?.primaryIcon);

  const renderCard = useCallback(
    ({ item, drag, isActive }: RenderItemParams<DailyCardKey>) => {
      if (!data) return null;
      return (
        <ScaleDecorator>
          <Pressable
            onLongPress={drag}
            delayLongPress={240}
            style={[styles.cardWrap, isActive && styles.cardWrapActive]}
          >
            {item === "primary" ? (
              // Only render the primary hero card on feast days. On plain
              // days the readings card (next in the order) becomes the
              // natural lead — no synthetic "verse of the day" needed,
              // since the appointed Gospel reading is the day's word.
              hasFeast ? <FeastHero data={data} /> : null
            ) : item === "readings" ? (
              <ReadingsCard data={data} />
            ) : item === "commemoration" ? (
              hasFeast ? (
                <CommemorationCard data={data} />
              ) : (
                <NoFeastCommemorationCard data={data} />
              )
            ) : item === "prayer" ? (
              <DailyPrayerCard streak={streak} />
            ) : item === "hymns" ? (
              <HymnsCard data={data} />
            ) : null}
          </Pressable>
        </ScaleDecorator>
      );
    },
    [data, hasFeast, streak],
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Three-stop backdrop: candlelight at the top fading through a warm
          midtone to the deep ground. The third stop ensures cards don't
          look washed out against the gradient. */}
      <LinearGradient
        colors={[
          "rgba(212, 168, 87, 0.13)",
          "rgba(139, 58, 58, 0.04)",
          colors.background,
        ]}
        locations={[0, 0.35, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <GestureHandlerRootView style={{ flex: 1 }}>
        {/* Masthead — wordmark on the left, halo avatar on the right. */}
        <View style={styles.masthead}>
          <Wordmark size={20} />
          <Pressable
            onPress={() => setDrawerOpen(true)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
          >
            <Halo size={40}>
              <Text style={styles.avatarInitial}>
                {(profile.displayName?.charAt(0) ?? "T").toUpperCase()}
              </Text>
            </Halo>
          </Pressable>
        </View>

        {/* Date label — read-only, today. The chevrons / picker / week
            strip are gone; this is purely a magazine masthead now. */}
        <View style={styles.dateRow}>
          <View style={styles.dateLineWrap}>
            <Text style={styles.dateLineLabel}>
              {data ? formatMastheadDate(data.daily.isoDate) : "Today"}
            </Text>
          </View>
        </View>

        {data ? (
          <View style={styles.dayStatusRow}>
            <FastChip
              isoDate={data.daily.isoDate}
              providedLabel={data.daily.fastLabel}
            />
          </View>
        ) : null}

        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : null}

        {error ? (
          <ScrollView contentContainerStyle={styles.errorWrap}>
            <Card>
              <Eyebrow tone="oxblood">Couldn&apos;t load today</Eyebrow>
              <Text style={[text.body, { color: colors.error, marginTop: spacing.sm }]}>
                {error instanceof Error ? error.message : String(error)}
              </Text>
              <Pressable
                onPress={() => refetch()}
                style={({ pressed }) => [
                  { marginTop: spacing.md },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.retryLabel}>
                  {isFetching ? "Retrying…" : "Try again"}
                </Text>
              </Pressable>
            </Card>
          </ScrollView>
        ) : null}

        {data ? (
          // Wrap in flex:1 View — DraggableFlatList's own style prop
          // doesn't reliably propagate flex sizing, and without an
          // explicit measurable height the FlatList collapses to 0
          // (cards rendered but not visible). The View establishes a
          // bounded height for the virtualization.
          <View style={{ flex: 1 }}>
            <DraggableFlatList
              data={cardOrder}
              keyExtractor={(key) => key}
              onDragEnd={({ data: next }) => onReorder(next)}
              activationDistance={8}
              renderItem={renderCard}
              containerStyle={{ flex: 1 }}
              contentContainerStyle={styles.listContent}
              // Footer: reorder hint + bottom clearance for the floating
              // tab bar. The hint disappears once the user reorders.
              ListFooterComponent={
                <View>
                  {!reorderHinted ? (
                    <View style={styles.reorderHint}>
                      <Feather
                        name="move"
                        size={12}
                        color={colors.accent}
                      />
                      <Text style={styles.reorderHintText}>
                        Long-press any card to reorder
                      </Text>
                    </View>
                  ) : null}
                  <View style={{ height: listBottomPadding }} />
                </View>
              }
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={isFetching && !isLoading}
                  onRefresh={() => refetch()}
                  tintColor={colors.accent}
                  colors={[colors.accent]}
                />
              }
            />
          </View>
        ) : null}
      </GestureHandlerRootView>

      <ProfileDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        profile={profile}
        streak={streak}
        savedCount={savedCount}
      />
    </SafeAreaView>
  );
}

// ---- Hero cards -----------------------------------------------------------

type DailyData = DailyResponse;

// Reusable fast-status chip — used in the DayStatus row under the
// masthead and inside the FeastHero. Renders "Apostles' Fast" / "Friday
// Fast" / "Fast Free" with a moon glyph (or coffee-cup for fast-free).
function FastChip({
  isoDate,
  providedLabel,
}: {
  isoDate: string;
  providedLabel?: string;
}) {
  const { label, isFastFree } = resolveFastLabel(isoDate, providedLabel);
  return (
    <View
      style={[styles.fastChip, isFastFree && styles.fastChipFree]}
    >
      <Feather
        name={isFastFree ? "coffee" : "moon"}
        size={11}
        color={isFastFree ? colors.inkMuted : colors.accent}
      />
      <Text
        style={[
          styles.fastChipText,
          isFastFree && styles.fastChipTextFree,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

// Find the saint whose name actually appears in the day's title — the
// most reliable way to identify the primary commemoration regardless of
// whether feastLabel is set. `data.saints[0]` is naive: on a feast day
// like Pentecost or Sunday of the Fathers, the saints array contains
// co-commemorations who happen to fall on that date (the apostle of
// the day, etc.), and the first one isn't the principal subject.
//
// Match strategy: take each saint's primary name (before the comma),
// split into significant words (skip "saint"/"the" and anything 3
// chars or shorter), and see if any word appears in the lowercased
// title. First match wins.
function findPrimarySaint(
  title: string,
  saints: DailyData["saints"],
): DailyData["saints"][number] | null {
  const normalized = title.toLowerCase();
  for (const saint of saints) {
    const primaryName = saint.name.split(",")[0].toLowerCase();
    const words = primaryName
      .split(/\s+/)
      .filter((w) => w.length > 3 && w !== "saint" && w !== "the");
    if (words.some((w) => normalized.includes(w))) {
      return saint;
    }
  }
  return null;
}

// FeastHero — the most considered card in the app. The icon is the eye
// magnet; the title is set in big italic serif; the feast label sits
// above in oxblood small caps.
function FeastHero({ data }: { data: DailyData }) {
  const linkedSaint = findPrimarySaint(data.daily.title, data.saints);

  const inner = (
    <>
      <View style={styles.heroEyebrowRow}>
        <Eyebrow tone="oxblood">
          {data.daily.feastLabel ?? "Today's commemoration"}
        </Eyebrow>
      </View>

      {data.primaryIcon ? (
        <View style={styles.heroIconWrap}>
          <Image
            source={{ uri: data.primaryIcon.src }}
            style={styles.heroIcon}
            contentFit="contain"
            transition={240}
            accessibilityLabel={data.primaryIcon.alt}
          />
        </View>
      ) : null}

      <Text style={text.titleDisplayItalic}>{data.daily.title}</Text>

      {data.daily.summary ? (
        <Text style={[text.bodyLong, { marginTop: spacing.md }]}>
          {data.daily.summary}
        </Text>
      ) : null}

      {linkedSaint ? (
        <View style={styles.heroCta}>
          <Text style={styles.heroCtaLabel}>Read the life</Text>
          <Feather name="arrow-right" size={13} color={colors.accent} />
        </View>
      ) : null}

      <GiltRule style={{ marginTop: spacing.lg }} />
    </>
  );

  if (linkedSaint) {
    return (
      <Pressable
        onPress={() => router.push(`/people/${linkedSaint.slug}`)}
        style={({ pressed }) => [pressed && { opacity: 0.92 }]}
        accessibilityRole="button"
        accessibilityLabel={`Read the life of ${linkedSaint.name}`}
      >
        <Card intent="hero" style={elevation.giltGlow}>
          {inner}
        </Card>
      </Pressable>
    );
  }
  return (
    <Card intent="hero" style={elevation.giltGlow}>
      {inner}
    </Card>
  );
}

// ---- Section cards --------------------------------------------------------

function ReadingsCard({ data }: { data: DailyData }) {
  // Sort copy so we don't mutate the query cache. Gospel first, then
  // Apostle/Epistle, then everything else, with OT/Psalms last — matches
  // the order most lectionaries set the readings out.
  const sortedReadings = [...data.readings].sort(
    (a, b) => readingPriority(a.label) - readingPriority(b.label),
  );
  return (
    <Card>
      <SectionHeader eyebrow="Lectionary" title="Scripture for the day" rule />
      {sortedReadings.length > 0 ? (
        <View style={styles.readingList}>
          {sortedReadings.map((reading, index) => (
            <ReadingRow
              key={reading.id}
              reading={reading}
              translation={data.translationSlug}
              index={index}
            />
          ))}
        </View>
      ) : (
        <Text style={text.body}>
          No appointed readings for this day yet.
        </Text>
      )}
    </Card>
  );
}

function ReadingRow({
  reading,
  translation,
  index,
}: {
  reading: DailyData["readings"][number];
  translation: string;
  index: number;
}) {
  return (
    <Pressable
      onPress={() => router.push(readingHref(translation, reading.scripture))}
      style={({ pressed }) => [
        styles.readingRow,
        pressed && { opacity: 0.7 },
      ]}
      accessibilityRole="button"
    >
      <View style={styles.readingLeft}>
        <Text style={styles.readingIndex}>
          {String(index + 1).padStart(2, "0")}
        </Text>
      </View>
      <View style={styles.readingMid}>
        <Eyebrow tone="accent">{reading.label}</Eyebrow>
        <Text style={styles.readingScripture}>{reading.scripture.label}</Text>
        <Text style={styles.readingContext}>{reading.contextLabel}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={colors.inkSoft} />
    </Pressable>
  );
}

function CommemorationCard({ data }: { data: DailyData }) {
  if (data.daily.additionalCommemorations.length === 0) {
    return null;
  }
  return (
    <Card>
      <SectionHeader eyebrow="Synaxis" title="Also commemorated" rule />
      <View style={styles.alsoList}>
        {data.daily.additionalCommemorations.map((item, index) => {
          const linkedSaint = item.saintId
            ? data.saints.find((s) => s.id === item.saintId)
            : undefined;
          return (
            <Pressable
              key={`${item.name}-${index}`}
              onPress={
                linkedSaint
                  ? () => router.push(`/people/${linkedSaint.slug}`)
                  : undefined
              }
              style={({ pressed }) => [
                styles.alsoRow,
                pressed && linkedSaint && { opacity: 0.6 },
              ]}
            >
              <View
                style={[
                  styles.alsoBullet,
                  linkedSaint && { backgroundColor: colors.accent },
                ]}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.alsoName}>{item.name}</Text>
                {item.summary ? (
                  <Text style={styles.alsoSummary}>{item.summary}</Text>
                ) : null}
              </View>
              {linkedSaint ? (
                <Feather
                  name="chevron-right"
                  size={16}
                  color={colors.inkSoft}
                />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

function NoFeastCommemorationCard({ data }: { data: DailyData }) {
  return (
    <Card>
      <SectionHeader eyebrow="Today" title={data.daily.title} />
      {data.daily.summary ? (
        <Text style={[text.bodyLong, { marginTop: spacing.sm }]}>
          {data.daily.summary}
        </Text>
      ) : null}
      {data.primaryIcon ? (
        <View style={styles.miniIconWrap}>
          <Image
            source={{ uri: data.primaryIcon.src }}
            style={styles.miniIcon}
            contentFit="contain"
            transition={200}
            accessibilityLabel={data.primaryIcon.alt}
          />
        </View>
      ) : null}
      {data.daily.additionalCommemorations.length > 0 ? (
        <>
          <GiltRule style={{ marginVertical: spacing.lg }} />
          <View style={styles.alsoList}>
            {data.daily.additionalCommemorations.slice(0, 4).map((item, index) => {
              const linkedSaint = item.saintId
                ? data.saints.find((s) => s.id === item.saintId)
                : undefined;
              return (
                <Pressable
                  key={`${item.name}-${index}`}
                  onPress={
                    linkedSaint
                      ? () => router.push(`/people/${linkedSaint.slug}`)
                      : undefined
                  }
                  style={({ pressed }) => [
                    styles.alsoRow,
                    pressed && linkedSaint && { opacity: 0.6 },
                  ]}
                >
                  <View
                    style={[
                      styles.alsoBullet,
                      linkedSaint && { backgroundColor: colors.accent },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.alsoName}>{item.name}</Text>
                    {item.summary ? (
                      <Text style={styles.alsoSummary}>{item.summary}</Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}
    </Card>
  );
}

function DailyPrayerCard({ streak }: { streak: number }) {
  return (
    <Card intent="oxblood" gradient>
      <SectionHeader eyebrow="Practice" title="Daily Prayer" />
      <Text style={[text.byline, { marginTop: spacing.sm }]}>
        Morning and evening — with today&apos;s appointed Gospel woven in.
      </Text>
      {streak > 0 ? (
        <View style={styles.streakBadgeRow}>
          <Feather name="award" size={14} color={colors.accent} />
          <Text style={styles.streakBadgeText}>
            {streak} {streak === 1 ? "day" : "days"} unbroken
          </Text>
        </View>
      ) : null}
      <View style={styles.prayerActions}>
        <PrayerAction
          slot="morning"
          glyph="sunrise"
          label="Morning"
        />
        <PrayerAction
          slot="evening"
          glyph="moon"
          label="Evening"
        />
      </View>
    </Card>
  );
}

function PrayerAction({
  slot,
  glyph,
  label,
}: {
  slot: "morning" | "evening";
  glyph: React.ComponentProps<typeof Feather>["name"];
  label: string;
}) {
  return (
    <Pressable
      onPress={() => router.push(`/prayer?slot=${slot}`)}
      style={({ pressed }) => [
        styles.prayerActionButton,
        pressed && { opacity: 0.85 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Open ${label} prayers`}
    >
      <Feather name={glyph} size={18} color={colors.accent} />
      <Text style={styles.prayerActionLabel}>{label}</Text>
      <Feather name="arrow-up-right" size={14} color={colors.inkSoft} />
    </Pressable>
  );
}

function HymnsCard({ data }: { data: DailyData }) {
  return (
    <Card>
      <SectionHeader eyebrow="Liturgy" title="Hymns of the day" rule />
      {data.hymns.length > 0 ? (
        <View style={styles.hymnList}>
          {data.hymns.map((hymn) => (
            <View key={hymn.id} style={styles.hymnBlock}>
              <View style={styles.hymnTopRow}>
                <Eyebrow tone="accent">{hymn.type}</Eyebrow>
                <Text style={styles.hymnTone}>{hymn.tone}</Text>
              </View>
              <Text style={styles.hymnTitle}>{hymn.title}</Text>
              <Text style={styles.hymnText}>{hymn.text}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={text.body}>
          No hymns yet appointed for this day.
        </Text>
      )}
    </Card>
  );
}

// ---- Styles ---------------------------------------------------------------

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  // Masthead: magazine cover bar — wordmark, halo avatar.
  masthead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  // Date pill — read-only "SUNDAY · MAY 17", centered. No chevrons or
  // calendar overlay; Daily is always today.
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  dateLineWrap: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: "rgba(212, 168, 87, 0.06)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
  },
  dateLineLabel: {
    fontFamily: fonts.sans,
    fontSize: 10,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 2.8,
    textTransform: "uppercase",
  },
  avatarInitial: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 18,
    color: colors.accent,
  },

  loading: { paddingVertical: spacing["3xl"], alignItems: "center" },
  errorWrap: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  retryLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.accent,
    letterSpacing: 0.6,
  },

  listContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    // paddingBottom is set inline by DailyScreen using safe-area insets +
    // the floating tab bar height so the last card (hymns) clears the
    // capsule on every device.
    gap: spacing.lg,
  },
  cardWrap: { marginBottom: spacing.lg },
  cardWrapActive: {
    shadowColor: colors.accent,
    shadowOpacity: 0.55,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 20,
  },

  // Reorder hint — appears below the last card on first visit and once
  // the user reorders we hide it. Subtle gilt-tinted pill row.
  reorderHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.lineGilt,
  },
  reorderHintText: {
    fontFamily: fonts.serifItalic,
    fontSize: 12,
    color: colors.inkSoft,
  },

  // Feast hero
  heroEyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  // FastChip — small pill showing today's fast status. Two variants:
  // accent (gold) for actual fasts (Wed/Fri/seasonal); muted (ink) for
  // fast-free days so the chip doesn't shout about non-restrictions.
  fastChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
  },
  fastChipFree: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
  },
  fastChipText: {
    fontFamily: fonts.sans,
    fontSize: 10,
    fontWeight: "600",
    color: colors.accent,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  fastChipTextFree: {
    color: colors.inkMuted,
  },

  // DayStatus row — appears under the date pill; always shows today's
  // fast status so the user knows even on plain days.
  dayStatusRow: {
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  heroIconWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: spacing.lg,
    height: 260,
  },
  heroIcon: {
    width: 220,
    height: 260,
    borderRadius: 4,
  },
  heroCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  heroCtaLabel: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 2,
    textTransform: "uppercase",
  },

  // Readings
  readingList: { marginTop: spacing.md, gap: spacing.md },
  readingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  readingLeft: { width: 32 },
  readingIndex: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 26,
    color: colors.accent,
    letterSpacing: -1,
    opacity: 0.9,
  },
  readingMid: { flex: 1, gap: 2 },
  readingScripture: {
    fontFamily: fonts.serif,
    fontSize: 19,
    color: colors.ink,
    letterSpacing: -0.2,
    lineHeight: 24,
  },
  readingContext: {
    fontFamily: fonts.serifItalic,
    fontSize: 12,
    color: colors.inkSoft,
  },

  // Also commemorated
  alsoList: { gap: spacing.md, marginTop: spacing.md },
  alsoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  alsoBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.inkSoft,
    marginTop: 8,
  },
  alsoName: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.ink,
    lineHeight: 22,
    letterSpacing: -0.1,
  },
  alsoSummary: {
    fontFamily: fonts.serifItalic,
    fontSize: 13,
    color: colors.inkSoft,
    lineHeight: 20,
    marginTop: 2,
  },

  miniIconWrap: {
    alignItems: "center",
    marginVertical: spacing.lg,
  },
  miniIcon: {
    width: 130,
    height: 150,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surfaceStrong,
  },

  // Prayer
  streakBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
    alignSelf: "flex-start",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
  },
  streakBadgeText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: "600",
    color: colors.accent,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  prayerActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  prayerActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.lineGilt,
    backgroundColor: "rgba(10, 9, 8, 0.4)",
  },
  prayerActionLabel: {
    fontFamily: fonts.serif,
    fontSize: 15,
    color: colors.ink,
    letterSpacing: -0.1,
  },

  // Hymns
  hymnList: { marginTop: spacing.md, gap: spacing.lg },
  hymnBlock: { gap: spacing.xs },
  hymnTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hymnTone: {
    fontFamily: fonts.serifItalic,
    fontSize: 12,
    color: colors.inkSoft,
  },
  hymnTitle: {
    fontFamily: fonts.serif,
    fontSize: 19,
    color: colors.ink,
    letterSpacing: -0.2,
    lineHeight: 24,
  },
  hymnText: {
    fontFamily: fonts.serif,
    fontSize: 15,
    lineHeight: 24,
    color: colors.inkMuted,
  },
});

import Feather from "@expo/vector-icons/Feather";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
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
import type { DailyResponse, ReadingPlanProgress } from "@theosis/core";

import {
  Card,
  Eyebrow,
  GiltRule,
  Halo,
  SectionHeader,
  Wordmark,
} from "@/components/theosis/primitives";
import { FastBanner } from "@/components/theosis/fast-banner";
import { ProfileDrawer } from "@/components/theosis/profile-drawer";
import { usePatronIcon } from "@/lib/use-patron-icon";
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
  type LastReadLocation,
  type ProfilePrefs,
  DEFAULT_DAILY_CARD_ORDER,
  getDailyCardOrder,
  getDailyHiddenCards,
  getFastBannerCollapsed,
  getLastReadLocation,
  getProfilePrefs,
  setFastBannerCollapsed,
  getReadingPlanProgress,
  getSavedVerses,
  isDailyReadingSaved,
  recordActivityToday,
  setDailyCardOrder,
  toggleSavedDailyReading,
} from "@/lib/preferences";

// Resolve a fast label for the day, respecting the user's fastingLevel
// preference. The API supplies a label during seasonal fasts (Lent,
// Apostles', Dormition, Nativity); we use it directly. For ordinary
// time we fall back to the weekly rule.
//
// fastingLevel:
//   strict   — every fast labeled prominently; Wed/Fri count as fasts.
//   standard — Wed/Fri labeled (default behavior).
//   relaxed  — show only seasonal fasts; on plain Wed/Fri render the
//              soft "Fast Free" treatment (so the chip doesn't shout).
function resolveFastLabel(
  isoDate: string,
  providedLabel: string | undefined,
  fastingLevel: ProfilePrefs["fastingLevel"] | undefined,
): { label: string; isFastFree: boolean } {
  if (providedLabel) return { label: providedLabel, isFastFree: false };
  const d = new Date(`${isoDate}T00:00:00Z`);
  const dow = d.getUTCDay(); // 0=Sun … 3=Wed, 5=Fri, 6=Sat
  if (fastingLevel === "relaxed") {
    // No seasonal fast label and the user has opted out of weekly
    // fasts — render the soft chip.
    return { label: "Fast Free", isFastFree: true };
  }
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

// Reading-row tap target. Returns a typed-router object so the Daily
// readings open the Bible reader at the right verse range.
function readingHref(
  translation: string,
  scripture: {
    bookSlug: string;
    chapterNumber: number;
    verseStart: number;
    verseEnd?: number;
  },
) {
  const { bookSlug, chapterNumber, verseStart, verseEnd } = scripture;
  const range =
    verseEnd && verseEnd !== verseStart
      ? `${verseStart}-${verseEnd}`
      : `${verseStart}`;
  return {
    pathname: "/explore" as const,
    params: {
      translation,
      book: bookSlug,
      chapter: String(chapterNumber),
      highlight: range,
    },
  };
}

// Local-timezone "today" — matches what a human means by today. Used to
// detect when the user has navigated away from today (shows the reset pill)
// and to seed the picker.
function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dateToIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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
  // Cards the user hid in Settings → daily page order. Kept in cardOrder so
  // they retain their slot; just filtered out of the rendered list.
  const [hiddenCards, setHiddenCards] = useState<DailyCardKey[]>([]);
  const [profile, setProfile] = useState<ProfilePrefs>({});
  const patronIcon = usePatronIcon(profile.patronSaintSlug);
  const [streak, setStreak] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [reorderHinted, setReorderHinted] = useState(false);
  const [lastRead, setLastRead] = useState<LastReadLocation | undefined>(
    undefined,
  );
  const [dailySaved, setDailySaved] = useState(false);
  const [fastCollapsed, setFastCollapsed] = useState(false);

  // Date navigation: undefined = today (the natural default). Selecting a
  // different date both refetches /api/daily?date=... and surfaces a
  // "Back to today" pill. The picker is a tap-toggle on the date label.
  const [selectedIso, setSelectedIso] = useState<string | undefined>(undefined);
  const [pickerOpen, setPickerOpen] = useState(false);
  const isToday = !selectedIso || selectedIso === todayIso();

  const { data, error, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["daily", selectedIso ?? "today"],
    queryFn: () => api.fetchDaily(selectedIso),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    let canceled = false;
    Promise.all([
      getDailyCardOrder(),
      recordActivityToday(),
      getSavedVerses(),
      getLastReadLocation(),
      getFastBannerCollapsed(),
      getDailyHiddenCards(),
    ]).then(([order, activity, saved, loc, fastCollapsedPref, hidden]) => {
      if (canceled) return;
      setCardOrderState(order);
      setStreak(activity.streak);
      setSavedCount(saved.length);
      setLastRead(loc);
      setFastCollapsed(fastCollapsedPref);
      setHiddenCards(hidden);
    });
    return () => {
      canceled = true;
    };
  }, []);

  // Profile prefs are refreshed every time the screen regains focus, so a
  // patron-saint change made in onboarding or settings shows up in the
  // masthead avatar immediately on the user's next visit to this tab.
  useFocusEffect(
    useCallback(() => {
      let canceled = false;
      void getProfilePrefs().then((p) => {
        if (!canceled) setProfile(p);
      });
      // Re-read card order + hidden cards so changes made in the Settings
      // reorder screen (drag order, eye toggle) show up on return.
      void Promise.all([getDailyCardOrder(), getDailyHiddenCards()]).then(
        ([order, hidden]) => {
          if (canceled) return;
          setCardOrderState(order);
          setHiddenCards(hidden);
        },
      );
      return () => {
        canceled = true;
      };
    }, []),
  );

  // Watch the daily response's iso date to compute whether *that* day
  // is currently bookmarked. We re-read on data change so the icon
  // reflects the right state even if the user navigates back from
  // saving on the same day.
  useEffect(() => {
    if (!data) return;
    let canceled = false;
    void isDailyReadingSaved(data.daily.isoDate).then((saved) => {
      if (!canceled) setDailySaved(saved);
    });
    return () => {
      canceled = true;
    };
  }, [data]);

  async function handleToggleDailySaved() {
    if (!data) return;
    const next = await toggleSavedDailyReading(data.daily.isoDate);
    setDailySaved(next.some((d) => d.isoDate === data.daily.isoDate));
  }

  // The list only shows visible (non-hidden) cards, so a reorder hands us the
  // visible subset. Splice it back into the full order, keeping hidden cards
  // pinned to their original slots so they reappear in place if unhidden.
  const onReorder = useCallback(
    (visibleNext: DailyCardKey[]) => {
      setCardOrderState((full) => {
        const merged = [...full];
        let v = 0;
        for (let i = 0; i < merged.length; i++) {
          if (!hiddenCards.includes(merged[i])) {
            merged[i] = visibleNext[v++];
          }
        }
        void setDailyCardOrder(merged);
        return merged;
      });
      setReorderHinted(true);
    },
    [hiddenCards],
  );

  const visibleOrder = cardOrder.filter((k) => !hiddenCards.includes(k));

  const onPickDate = (event: DateTimePickerEvent, picked?: Date) => {
    // Android dismisses the picker on its own and fires "dismissed" / "set"
    // events; iOS keeps the inline picker mounted until we close.
    if (Platform.OS !== "ios") setPickerOpen(false);
    if (event.type === "set" && picked) {
      setSelectedIso(dateToIso(picked));
    }
  };

  const resetToToday = () => {
    setSelectedIso(undefined);
    setPickerOpen(false);
  };

  // Shift the selected date by ±1 day. When the result lands on today,
  // clear the override so the "back to today" pill hides.
  const shiftDay = useCallback(
    (delta: number) => {
      const base = selectedIso ?? (data?.daily.isoDate ?? todayIso());
      const d = new Date(`${base}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + delta);
      const nextIso = dateToIso(d);
      setSelectedIso(nextIso === todayIso() ? undefined : nextIso);
    },
    [selectedIso, data?.daily.isoDate],
  );

  const hasFeast = Boolean(data?.daily.feastLabel || data?.primaryIcon);

  const renderCard = useCallback(
    ({ item, drag, isActive }: RenderItemParams<DailyCardKey>) => {
      if (!data) return null;
      // Compute the card body first so we can skip the wrapper (and its
      // drag handle) entirely for cards that render nothing today — e.g.
      // the feast hero on an ordinary day, or continue-reading before the
      // user has opened the Bible.
      const content =
        item === "primary" ? (
          hasFeast ? <FeastHero data={data} /> : null
        ) : item === "continue-reading" ? (
          lastRead ? <ContinueReadingCard lastRead={lastRead} /> : null
        ) : item === "reading-plan" ? (
          <ReadingPlanCard />
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
        ) : null;

      if (!content) return null;

      return (
        <ScaleDecorator>
          <Pressable
            onLongPress={drag}
            delayLongPress={240}
            style={[styles.cardWrap, isActive && styles.cardWrapActive]}
          >
            {content}
            {/* Dedicated drag handle. Many cards are themselves tappable
                (reading plan, feast hero) or contain tappable rows
                (commemoration), so a long-press on the card body gets
                captured by those and never starts a drag. This grip sits
                on top in the corner and reliably initiates the drag for
                every card. The full Settings reorder list is the other
                way to do this. */}
            <Pressable
              onLongPress={drag}
              delayLongPress={180}
              hitSlop={10}
              style={styles.dragHandle}
              accessibilityRole="button"
              accessibilityLabel="Hold and drag to reorder this card"
            >
              <Feather name="menu" size={14} color={colors.inkSoft} />
            </Pressable>
          </Pressable>
        </ScaleDecorator>
      );
    },
    [data, hasFeast, streak, lastRead],
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
              {patronIcon ? (
                <Image
                  source={{ uri: patronIcon.src }}
                  accessibilityLabel={patronIcon.alt}
                  style={styles.avatarImage}
                  contentFit="cover"
                />
              ) : (
                <Text style={styles.avatarInitial}>
                  {(profile.displayName?.charAt(0) ?? "T").toUpperCase()}
                </Text>
              )}
            </Halo>
          </Pressable>
        </View>

        {/* Date row — prev chevron, tappable date label (opens calendar
            picker), next chevron, plus the bookmark for saving the day.
            Tapping the date toggles an inline DateTimePicker for jumping
            to any year/month/day in 1900–2099. */}
        <View style={styles.dateRow}>
          <Pressable
            onPress={() => shiftDay(-1)}
            hitSlop={10}
            style={({ pressed }) => [
              styles.dateArrow,
              pressed && { opacity: 0.6 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Previous day"
          >
            <Feather name="chevron-left" size={16} color={colors.inkMuted} />
          </Pressable>
          <Pressable
            onPress={() => setPickerOpen((open) => !open)}
            style={({ pressed }) => [
              styles.dateLineWrap,
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Open calendar picker"
            hitSlop={6}
          >
            <Text style={styles.dateLineLabel}>
              {data ? formatMastheadDate(data.daily.isoDate) : "Today"}
            </Text>
            <Feather
              name={pickerOpen ? "chevron-up" : "chevron-down"}
              size={12}
              color={colors.accent}
              style={{ marginLeft: spacing.xs }}
            />
          </Pressable>
          <Pressable
            onPress={() => shiftDay(1)}
            hitSlop={10}
            style={({ pressed }) => [
              styles.dateArrow,
              pressed && { opacity: 0.6 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Next day"
          >
            <Feather name="chevron-right" size={16} color={colors.inkMuted} />
          </Pressable>
          {data ? (
            <Pressable
              onPress={handleToggleDailySaved}
              hitSlop={10}
              style={({ pressed }) => [
                styles.bookmarkButton,
                dailySaved && styles.bookmarkButtonActive,
                pressed && { opacity: 0.6 },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: dailySaved }}
              accessibilityLabel={
                dailySaved
                  ? "Remove this day from saved daily readings"
                  : "Save this daily reading"
              }
            >
              <Feather
                name="bookmark"
                size={12}
                color={dailySaved ? colors.accent : colors.inkMuted}
              />
            </Pressable>
          ) : null}
        </View>

        {!isToday ? (
          <Pressable
            onPress={resetToToday}
            style={({ pressed }) => [
              styles.todayResetButton,
              pressed && { opacity: 0.6 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Back to today"
          >
            <Feather name="arrow-left" size={12} color={colors.accent} />
            <Text style={styles.todayResetText}>Back to today</Text>
          </Pressable>
        ) : null}

        {pickerOpen && data ? (
          <View style={styles.pickerWrap}>
            <DateTimePicker
              value={new Date(`${data.daily.isoDate}T00:00:00`)}
              mode="date"
              display={Platform.OS === "ios" ? "inline" : "default"}
              onChange={onPickDate}
              themeVariant="dark"
              textColor={colors.ink}
              accentColor={colors.accent}
              minimumDate={new Date("1900-01-01")}
              maximumDate={new Date("2099-12-31")}
            />
          </View>
        ) : null}

        {data ? (
          <View style={styles.dayStatusRow}>
            <FastBanner
              detail={data.fastDetail}
              fastingLevel={profile.fastingLevel}
              collapsed={fastCollapsed}
              onToggleCollapsed={() => {
                const next = !fastCollapsed;
                setFastCollapsed(next);
                void setFastBannerCollapsed(next);
              }}
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
              data={visibleOrder}
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
                        Hold the grip on a card to reorder · or set the order
                        in Settings
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
  fastingLevel,
}: {
  isoDate: string;
  providedLabel?: string;
  fastingLevel?: ProfilePrefs["fastingLevel"];
}) {
  const { label, isFastFree } = resolveFastLabel(
    isoDate,
    providedLabel,
    fastingLevel,
  );
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

// Continue reading — surfaces the user's last Bible location with a
// CTA back to the reader. Quiet on first launch (no lastRead set);
// becomes a regular feature once the user reads anything.
function ContinueReadingCard({
  lastRead,
}: {
  lastRead: LastReadLocation;
}) {
  const bookLabel = lastRead.book
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <Pressable
      onPress={() =>
        router.push(
          `/explore?translation=${lastRead.translation}&book=${lastRead.book}&chapter=${lastRead.chapter}`,
        )
      }
      style={({ pressed }) => [pressed && { opacity: 0.92 }]}
      accessibilityRole="button"
      accessibilityLabel={`Continue reading ${bookLabel} chapter ${lastRead.chapter}`}
    >
      <Card>
        <SectionHeader eyebrow="Where you left off" title="Continue reading" />
        <View style={styles.continueRow}>
          <View style={styles.continueText}>
            <Text style={styles.continueBook}>{bookLabel}</Text>
            <Text style={styles.continueChapter}>
              Chapter {lastRead.chapter}
              {lastRead.translation
                ? ` · ${lastRead.translation.toUpperCase()}`
                : ""}
            </Text>
          </View>
          <View style={styles.continueCta}>
            <Text style={styles.continueCtaLabel}>Open</Text>
            <Feather name="arrow-right" size={14} color={colors.accent} />
          </View>
        </View>
      </Card>
    </Pressable>
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

// Reading-plan card. Shows today's reading from the user's most recently
// touched active plan, or a "Start a plan" nudge when none is active.
// Loads progress on focus + the plan corpus from /api/reading-plans.
function ReadingPlanCard() {
  const api = getApi();
  const plansQuery = useQuery({
    queryKey: ["reading-plans"],
    queryFn: () => api.fetchReadingPlans(),
    staleTime: 1000 * 60 * 30,
  });
  const [progress, setProgress] = useState<ReadingPlanProgress[]>([]);
  useFocusEffect(
    useCallback(() => {
      void getReadingPlanProgress().then(setProgress);
    }, []),
  );

  if (!plansQuery.data) {
    return null;
  }

  const plans = plansQuery.data.plans;

  // No active plans → render the discovery nudge.
  if (progress.length === 0) {
    return (
      <Pressable
        onPress={() => router.push("/reading-plans" as never)}
        style={({ pressed }) => [pressed && { opacity: 0.92 }]}
        accessibilityRole="button"
        accessibilityLabel="Browse reading plans"
      >
        <Card>
          <SectionHeader eyebrow="Read with the Church" title="Start a plan" />
          <Text style={[text.byline, { marginTop: spacing.sm }]}>
            The New Testament in 90 days, the Psalter in a month, or Holy
            Week day by day.
          </Text>
          <View style={readingPlanCardStyles.cta}>
            <Text style={readingPlanCardStyles.ctaLabel}>Browse plans</Text>
            <Feather name="arrow-right" size={14} color={colors.accent} />
          </View>
        </Card>
      </Pressable>
    );
  }

  // Active plans → focus on the most recently touched one.
  const focus = [...progress].sort((a, b) =>
    (b.lastReadAt ?? b.startedAt).localeCompare(a.lastReadAt ?? a.startedAt),
  )[0];
  const plan = plans.find((p) => p.id === focus.planId);
  if (!plan) return null;

  const completedCount = focus.completedDays.length;
  const isFinished = completedCount >= plan.totalDays;
  const percent = Math.min(100, Math.round((completedCount / plan.totalDays) * 100));

  return (
    <Pressable
      onPress={() => router.push(`/reading-plans/${plan.slug}` as never)}
      style={({ pressed }) => [pressed && { opacity: 0.92 }]}
      accessibilityRole="button"
      accessibilityLabel={`Open ${plan.title}`}
    >
      <Card>
        <SectionHeader
          eyebrow={plan.title}
          title={
            isFinished
              ? "You finished this plan"
              : `Day ${focus.currentDay} of ${plan.totalDays}`
          }
        />
        <View style={readingPlanCardStyles.progressTrack}>
          <View
            style={[
              readingPlanCardStyles.progressFill,
              { width: `${percent}%` },
            ]}
          />
        </View>
        <View style={readingPlanCardStyles.cta}>
          <Text style={readingPlanCardStyles.ctaLabel}>
            {isFinished ? "Review schedule" : "Open today's reading"}
          </Text>
          <Feather name="arrow-right" size={14} color={colors.accent} />
        </View>
      </Card>
    </Pressable>
  );
}

const readingPlanCardStyles = StyleSheet.create({
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: spacing.md,
  },
  ctaLabel: {
    ...text.eyebrowAccent,
    fontSize: 10,
  },
  progressTrack: {
    height: 3,
    borderRadius: 999,
    backgroundColor: colors.line,
    overflow: "hidden",
    marginTop: spacing.md,
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.accent,
    opacity: 0.7,
    borderRadius: 999,
  },
});

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
  // calendar overlay; Daily is always today. The bookmark sits next to
  // the pill (also centered) so the user can save the day.
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  dateLineWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: "rgba(212, 168, 87, 0.06)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
  },
  dateArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  todayResetButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    marginTop: -spacing.xs,
    marginBottom: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
  },
  todayResetText: {
    fontFamily: fonts.sans,
    fontSize: 10,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  pickerWrap: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  bookmarkButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  bookmarkButtonActive: {
    backgroundColor: colors.accentSoft,
    borderColor: "rgba(212, 168, 87, 0.5)",
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
  avatarImage: {
    width: "100%",
    height: "100%",
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
  dragHandle: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
    opacity: 0.9,
    zIndex: 10,
  },
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

  // Continue reading card
  continueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  continueText: { flex: 1, gap: 2 },
  continueBook: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 22,
    color: colors.ink,
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  continueChapter: {
    fontFamily: fonts.serifItalic,
    fontSize: 13,
    color: colors.inkSoft,
  },
  continueCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
  },
  continueCtaLabel: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 1.4,
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

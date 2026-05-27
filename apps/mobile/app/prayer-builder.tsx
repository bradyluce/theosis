// Prayer rule builder. Browse the full corpus of public-domain
// Orthodox prayers (Trisagion, Lord's Prayer, Symbol of Faith,
// Jordanville morning/evening prayers, St. Macarius, St. John of
// Damascus, Psalm 50, etc.) and dynamic lectionary inserts (Gospel,
// Epistle, appointed Psalm of the day), with a "+" button next to
// each prayer that adds it to the current slot (morning or evening).
//
// "Your X rule" lives at the top — collapsible card with the current
// ordering, remove (×) on each entry, up/down arrows to reorder.
//
// "Save as PDF" calls into lib/prayer-rule-pdf.ts which renders an
// elite-aesthetic HTML template through expo-print + expo-sharing so
// the user can save to Files / AirPrint / Mail.
//
// Diptych names — the user's personal book of living/departed —
// surface as a link at the bottom; they fold into the rule via the
// "intercession-living" / "intercession-departed" prayer entries.

import Feather from "@expo/vector-icons/Feather";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  Card,
  Eyebrow,
  GiltRule,
  SectionHeader,
  Wordmark,
} from "@/components/theosis/primitives";
import { colors, fonts, radii, spacing } from "@/constants/theosis-theme";
import {
  type PrayerRule,
  addPrayerToRule,
  getPrayerRule,
  removePrayerFromRule,
  reorderPrayerRule,
  setPrayerRule,
} from "@/lib/preferences";
import {
  DYNAMIC_BY_ID,
  DYNAMIC_ITEMS,
  PRAYER_BY_ID,
  PRAYER_CORPUS,
  STARTER_RULE,
  type DynamicItem,
  type PrayerEntry,
} from "@/lib/prayer-corpus";
import { generateAndSharePrayerRulePdf } from "@/lib/prayer-rule-pdf";

type Slot = "morning" | "evening";

export default function PrayerBuilderScreen() {
  const [slot, setSlot] = useState<Slot>("morning");
  const [rule, setRule] = useState<PrayerRule | null>(null);
  const [query, setQuery] = useState("");
  const [generating, setGenerating] = useState(false);

  // Seed the starter rule on first launch so the user opens to a
  // working rule (Trisagion, Our Father, etc.) instead of an empty
  // page. The seed only fires once — the `initialized` sentinel keeps
  // it from re-running on every open.
  useFocusEffect(
    useCallback(() => {
      let canceled = false;
      void getPrayerRule().then(async (stored) => {
        if (canceled) return;
        if (!stored.initialized) {
          const seeded: PrayerRule = {
            morning: STARTER_RULE.morning,
            evening: STARTER_RULE.evening,
            initialized: true,
          };
          await setPrayerRule(seeded);
          setRule(seeded);
        } else {
          setRule(stored);
        }
      });
      return () => {
        canceled = true;
      };
    }, []),
  );

  const slotIds = rule?.[slot] ?? [];

  async function handleAdd(id: string) {
    const next = await addPrayerToRule(slot, id);
    setRule(next);
  }
  async function handleRemove(id: string) {
    const next = await removePrayerFromRule(slot, id);
    setRule(next);
  }
  async function handleMoveUp(index: number) {
    if (index <= 0) return;
    const next = [...slotIds];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    const updated = await reorderPrayerRule(slot, next);
    setRule(updated);
  }
  async function handleMoveDown(index: number) {
    if (index >= slotIds.length - 1) return;
    const next = [...slotIds];
    [next[index + 1], next[index]] = [next[index], next[index + 1]];
    const updated = await reorderPrayerRule(slot, next);
    setRule(updated);
  }

  async function handleExportPdf() {
    if (!rule) return;
    if (rule.morning.length === 0 && rule.evening.length === 0) {
      Alert.alert(
        "Your rule is empty",
        "Add at least one prayer before exporting.",
      );
      return;
    }
    if (generating) return;
    setGenerating(true);
    try {
      await generateAndSharePrayerRulePdf({
        morning: rule.morning,
        evening: rule.evening,
      });
    } catch (err) {
      Alert.alert(
        "Couldn't export PDF",
        err instanceof Error ? err.message : String(err),
      );
    } finally {
      setGenerating(false);
    }
  }

  // Filter the corpus by the query string and group into sections that
  // mirror the prayer book's natural order: Daily lectionary / Slot
  // prayers / Essentials & Creed / Psalms / Intercession.
  const sections = useMemo(() => buildSections(slot, query), [slot, query]);

  const slotCount = slotIds.length;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={[
          slot === "morning"
            ? "rgba(212, 168, 87, 0.13)"
            : "rgba(106, 67, 130, 0.10)",
          "rgba(139, 58, 58, 0.04)",
          colors.background,
        ]}
        locations={[0, 0.42, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.masthead}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={({ pressed }) => [
            styles.backButton,
            pressed && { opacity: 0.6 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Feather name="chevron-left" size={20} color={colors.inkMuted} />
        </Pressable>
        <Wordmark size={16} subline="Prayer rule" />
        <Pressable
          onPress={handleExportPdf}
          disabled={generating}
          hitSlop={8}
          style={({ pressed }) => [
            styles.pdfButton,
            generating && { opacity: 0.4 },
            pressed && { opacity: 0.7 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Save rule as PDF"
        >
          <Feather name="printer" size={14} color={colors.accent} />
          <Text style={styles.pdfButtonLabel}>
            {generating ? "Building…" : "PDF"}
          </Text>
        </Pressable>
      </View>
      <GiltRule full style={{ marginHorizontal: spacing.xl }} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Eyebrow tone="accent">Public-domain Orthodox prayers</Eyebrow>
          <Text style={styles.title}>Build your rule</Text>
          <Text style={styles.subtitle}>
            Pick from the prayer corpus and the day&apos;s appointed readings.
            Save as a PDF you can print and keep at the icon corner.
          </Text>
          <GiltRule style={{ alignSelf: "flex-start", marginTop: spacing.md }} />
        </View>

        {/* Slot tabs */}
        <View style={styles.slotTabs}>
          {(["morning", "evening"] as Slot[]).map((s) => {
            const active = s === slot;
            return (
              <Pressable
                key={s}
                onPress={() => setSlot(s)}
                style={({ pressed }) => [
                  styles.slotTab,
                  active && styles.slotTabActive,
                  pressed && !active && { opacity: 0.7 },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Feather
                  name={s === "morning" ? "sunrise" : "moon"}
                  size={14}
                  color={active ? colors.accent : colors.inkMuted}
                />
                <Text
                  style={[
                    styles.slotTabLabel,
                    active && styles.slotTabLabelActive,
                  ]}
                >
                  {s === "morning" ? "Morning" : "Evening"}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Current rule */}
        <Card>
          <SectionHeader
            eyebrow={`${slotCount} ${slotCount === 1 ? "prayer" : "prayers"} in your ${slot} rule`}
            title="Your rule"
            rule
          />
          {slotIds.length === 0 ? (
            <Text style={styles.emptyHint}>
              Your {slot} rule is empty. Browse the corpus below and tap
              the + on any prayer to add it.
            </Text>
          ) : (
            <View style={styles.ruleList}>
              {slotIds.map((id, index) => (
                <RuleRow
                  key={`${id}-${index}`}
                  id={id}
                  position={index + 1}
                  isFirst={index === 0}
                  isLast={index === slotIds.length - 1}
                  onRemove={() => handleRemove(id)}
                  onMoveUp={() => handleMoveUp(index)}
                  onMoveDown={() => handleMoveDown(index)}
                />
              ))}
            </View>
          )}
        </Card>

        {/* Search */}
        <View style={styles.searchBlock}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search the prayer corpus"
            placeholderTextColor={colors.inkSoft}
            style={styles.search}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
        </View>

        {/* Sections */}
        {sections.map((section) => (
          <Card key={section.label}>
            <SectionHeader
              eyebrow={section.eyebrow}
              title={section.label}
              rule
            />
            <View style={styles.cardList}>
              {section.dynamic?.map((dyn) => (
                <PickerRow
                  key={dyn.id}
                  title={dyn.title}
                  subtitle={dyn.subtitle}
                  added={slotIds.includes(dyn.id)}
                  dynamic
                  onAdd={() => handleAdd(dyn.id)}
                />
              ))}
              {section.prayers.map((prayer) => (
                <PickerRow
                  key={prayer.id}
                  title={prayer.title}
                  subtitle={prayer.subtitle ?? prayer.attribution}
                  preview={prayer.body.split("\n\n")[0]?.slice(0, 140)}
                  added={slotIds.includes(prayer.id)}
                  onAdd={() => handleAdd(prayer.id)}
                />
              ))}
            </View>
          </Card>
        ))}

        {/* Diptych link */}
        <Pressable
          onPress={() => router.push("/diptych")}
          style={({ pressed }) => [
            styles.diptychLink,
            pressed && { opacity: 0.85 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Open diptych"
        >
          <Feather name="users" size={16} color={colors.accent} />
          <View style={styles.diptychText}>
            <Text style={styles.diptychLabel}>Edit your diptych</Text>
            <Text style={styles.diptychSub}>
              Names of the living and departed you pray for. Intercession
              prayers in the corpus read your diptych aloud.
            </Text>
          </View>
          <Feather name="chevron-right" size={16} color={colors.inkSoft} />
        </Pressable>

        {/* Big PDF action at the bottom — the same one as in the masthead,
            harder to miss. */}
        <Pressable
          onPress={handleExportPdf}
          disabled={generating || slotIds.length === 0}
          style={({ pressed }) => [
            styles.bigPdfButton,
            (generating || slotIds.length === 0) && { opacity: 0.45 },
            pressed && { opacity: 0.85 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Save rule as PDF"
        >
          <Feather name="download" size={16} color={colors.background} />
          <Text style={styles.bigPdfLabel}>
            {generating ? "Building PDF…" : "Save rule as PDF"}
          </Text>
        </Pressable>

        <Text style={styles.footer}>
          All prayers are public-domain Orthodox texts (Jordanville Prayer
          Book, public-domain Scripture, the Ecumenical Creed).
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function RuleRow({
  id,
  position,
  isFirst,
  isLast,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  id: string;
  position: number;
  isFirst: boolean;
  isLast: boolean;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const dyn = DYNAMIC_BY_ID.get(id);
  const prayer = PRAYER_BY_ID.get(id);
  const title = dyn?.title ?? prayer?.title ?? id;
  const subtitle = dyn?.subtitle ?? prayer?.subtitle ?? prayer?.attribution;
  return (
    <View style={[styles.ruleRow, dyn && styles.ruleRowDynamic]}>
      <Text style={styles.rulePosition}>
        {String(position).padStart(2, "0")}
      </Text>
      <View style={styles.ruleMain}>
        <Text style={styles.ruleTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.ruleSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Pressable
        onPress={onMoveUp}
        disabled={isFirst}
        hitSlop={6}
        style={({ pressed }) => [
          styles.iconButton,
          isFirst && styles.iconButtonDisabled,
          pressed && !isFirst && { opacity: 0.6 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Move ${title} earlier`}
      >
        <Feather
          name="chevron-up"
          size={14}
          color={isFirst ? colors.inkSoft : colors.inkMuted}
        />
      </Pressable>
      <Pressable
        onPress={onMoveDown}
        disabled={isLast}
        hitSlop={6}
        style={({ pressed }) => [
          styles.iconButton,
          isLast && styles.iconButtonDisabled,
          pressed && !isLast && { opacity: 0.6 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Move ${title} later`}
      >
        <Feather
          name="chevron-down"
          size={14}
          color={isLast ? colors.inkSoft : colors.inkMuted}
        />
      </Pressable>
      <Pressable
        onPress={onRemove}
        hitSlop={8}
        style={({ pressed }) => [
          styles.iconButton,
          pressed && { opacity: 0.6 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${title}`}
      >
        <Feather name="x" size={14} color={colors.oxbloodInk} />
      </Pressable>
    </View>
  );
}

function PickerRow({
  title,
  subtitle,
  preview,
  added,
  dynamic,
  onAdd,
}: {
  title: string;
  subtitle?: string;
  preview?: string;
  added: boolean;
  dynamic?: boolean;
  onAdd: () => void;
}) {
  return (
    <View style={[styles.pickerRow, dynamic && styles.pickerRowDynamic]}>
      <View style={styles.pickerText}>
        {subtitle ? (
          <Text style={styles.pickerSubtitle}>{subtitle}</Text>
        ) : null}
        <Text style={styles.pickerTitle}>{title}</Text>
        {preview ? (
          <Text style={styles.pickerPreview} numberOfLines={2}>
            {preview}…
          </Text>
        ) : null}
      </View>
      <Pressable
        onPress={onAdd}
        hitSlop={6}
        style={({ pressed }) => [
          styles.addButton,
          added && styles.addButtonAdded,
          pressed && { opacity: 0.7 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={
          added ? `${title} already added. Add again.` : `Add ${title}`
        }
      >
        <Feather
          name={added ? "check" : "plus"}
          size={15}
          color={added ? colors.background : colors.accent}
        />
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Sections — group the corpus into the natural rendering order
// ---------------------------------------------------------------------------

type Section = {
  label: string;
  eyebrow: string;
  prayers: PrayerEntry[];
  dynamic?: DynamicItem[];
};

function buildSections(slot: Slot, query: string): Section[] {
  const q = query.trim().toLowerCase();
  const matches = (p: PrayerEntry) =>
    !q ||
    p.title.toLowerCase().includes(q) ||
    p.subtitle?.toLowerCase().includes(q) ||
    p.category.includes(q) ||
    p.body.toLowerCase().includes(q);

  const filteredFor = (predicate: (p: PrayerEntry) => boolean) =>
    PRAYER_CORPUS.filter((p) => predicate(p) && matches(p));

  const slotPrayers = filteredFor(
    (p) =>
      p.suggestedFor.includes(slot) &&
      p.category !== "essential" &&
      p.category !== "creed",
  );
  const essentials = filteredFor(
    (p) => p.category === "essential" || p.category === "creed",
  );
  const psalms = filteredFor((p) => p.category === "psalms");
  const intercession = filteredFor((p) => p.category === "intercession");

  const dynamic = q
    ? DYNAMIC_ITEMS.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.subtitle.toLowerCase().includes(q),
      )
    : DYNAMIC_ITEMS;

  return [
    {
      label: "Daily lectionary",
      eyebrow: "Pulled live each day",
      prayers: [],
      dynamic,
    },
    {
      label: slot === "morning" ? "Morning" : "Evening",
      eyebrow:
        slot === "morning"
          ? "Prayers upon rising"
          : "Prayers before sleep",
      prayers: slotPrayers,
    },
    {
      label: "Essentials & Creed",
      eyebrow: "The fundamentals",
      prayers: essentials,
    },
    { label: "Psalms", eyebrow: "Appointed psalmody", prayers: psalms },
    {
      label: "Intercession",
      eyebrow: "For others",
      prayers: intercession,
    },
  ].filter(
    (s) =>
      s.prayers.length > 0 || (s.dynamic && s.dynamic.length > 0),
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  masthead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  pdfButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
    backgroundColor: "rgba(212, 168, 87, 0.08)",
  },
  pdfButtonLabel: {
    fontFamily: fonts.sans,
    fontSize: 10.5,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing["4xl"],
    gap: spacing.xl,
  },
  hero: { gap: spacing.sm, paddingHorizontal: spacing.sm },
  title: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 38,
    color: colors.ink,
    letterSpacing: -0.6,
    lineHeight: 42,
  },
  subtitle: {
    fontSize: 14,
    color: colors.inkMuted,
    lineHeight: 21,
    marginTop: spacing.xs,
  },

  slotTabs: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: 4,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  slotTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: radii.pill,
  },
  slotTabActive: {
    backgroundColor: colors.accentSoft,
  },
  slotTabLabel: {
    fontFamily: fonts.sans,
    fontSize: 12,
    fontWeight: "700",
    color: colors.inkMuted,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  slotTabLabelActive: { color: colors.accent },

  emptyHint: {
    fontFamily: fonts.serifItalic,
    fontSize: 14,
    color: colors.inkSoft,
    lineHeight: 21,
    paddingVertical: spacing.md,
  },

  ruleList: { gap: spacing.xs, marginTop: spacing.md },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.background,
  },
  ruleRowDynamic: {
    borderColor: "rgba(212, 168, 87, 0.4)",
    backgroundColor: "rgba(212, 168, 87, 0.06)",
  },
  rulePosition: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 18,
    color: colors.accent,
    width: 28,
    letterSpacing: -0.5,
  },
  ruleMain: { flex: 1, gap: 2 },
  ruleTitle: {
    fontFamily: fonts.serif,
    fontSize: 15,
    color: colors.ink,
    letterSpacing: -0.1,
  },
  ruleSubtitle: {
    fontFamily: fonts.serifItalic,
    fontSize: 11,
    color: colors.inkSoft,
  },
  iconButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonDisabled: { opacity: 0.3 },

  searchBlock: {
    paddingHorizontal: spacing.xs,
  },
  search: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontFamily: fonts.serif,
    fontSize: 15,
    color: colors.ink,
  },

  cardList: { gap: spacing.sm, marginTop: spacing.md },
  pickerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.background,
  },
  pickerRowDynamic: {
    borderColor: "rgba(212, 168, 87, 0.3)",
    backgroundColor: "rgba(212, 168, 87, 0.06)",
  },
  pickerText: { flex: 1, gap: 4 },
  pickerSubtitle: {
    fontFamily: fonts.sans,
    fontSize: 10,
    fontWeight: "700",
    color: colors.inkSoft,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  pickerTitle: {
    fontFamily: fonts.serif,
    fontSize: 17,
    color: colors.ink,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  pickerPreview: {
    fontFamily: fonts.serifItalic,
    fontSize: 12,
    color: colors.inkSoft,
    lineHeight: 18,
    marginTop: 4,
  },
  addButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(212, 168, 87, 0.5)",
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  addButtonAdded: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },

  diptychLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
    backgroundColor: "rgba(212, 168, 87, 0.04)",
  },
  diptychText: { flex: 1, gap: 2 },
  diptychLabel: {
    fontFamily: fonts.serif,
    fontSize: 15,
    color: colors.ink,
    letterSpacing: -0.1,
  },
  diptychSub: {
    fontSize: 12,
    color: colors.inkMuted,
    lineHeight: 17,
  },

  bigPdfButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  bigPdfLabel: {
    fontFamily: fonts.serif,
    fontSize: 15,
    color: colors.background,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  footer: {
    fontFamily: fonts.serifItalic,
    fontSize: 11,
    color: colors.inkSoft,
    textAlign: "center",
    lineHeight: 17,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
});

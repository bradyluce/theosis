import { Stack, router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, fonts, radii, spacing, text } from "@/constants/theosis-theme";
import {
  addPrayerToRule,
  getPrayerRule,
  type PrayerRule,
} from "@/lib/preferences";
import {
  DYNAMIC_ITEMS,
  PRAYER_CORPUS,
  type DynamicItem,
  type PrayerEntry,
} from "@/lib/prayer-corpus";

// Prayer picker — opened from the Prayer Rule edit screen as a modal.
// Lists every available prayer + dynamic item, grouped by category, with
// a + button to add to the active slot. Adding doesn't dismiss — users
// can stack several adds in one trip.

type Slot = "morning" | "evening";

type Section = {
  label: string;
  prayers: PrayerEntry[];
  dynamic?: DynamicItem[];
};

function buildSections(slot: Slot, query: string): Section[] {
  const q = query.trim().toLowerCase();
  const matches = (p: PrayerEntry) =>
    !q ||
    p.title.toLowerCase().includes(q) ||
    p.subtitle?.toLowerCase().includes(q) ||
    p.category.includes(q);

  const filteredFor = (predicate: (p: PrayerEntry) => boolean) =>
    PRAYER_CORPUS.filter((p) => predicate(p) && matches(p));

  // Prayers tagged for the active slot get top billing; anytime/essential
  // prayers (Trisagion, Our Father, Creed) go under "Essentials"; the
  // remaining prayers from the other slot stay accessible at the bottom.
  const slotPrayers = filteredFor(
    (p) => p.suggestedFor.includes(slot) && p.category !== "essential" && p.category !== "creed",
  );
  const essentials = filteredFor(
    (p) => p.category === "essential" || p.category === "creed",
  );
  const psalms = filteredFor((p) => p.category === "psalms");
  const intercession = filteredFor((p) => p.category === "intercession");

  const dynamic = q
    ? DYNAMIC_ITEMS.filter((d) =>
        d.title.toLowerCase().includes(q) || d.subtitle.toLowerCase().includes(q),
      )
    : DYNAMIC_ITEMS;

  return [
    {
      label: "Daily lectionary",
      prayers: [],
      dynamic,
    },
    {
      label: slot === "morning" ? "Morning prayers" : "Evening prayers",
      prayers: slotPrayers,
    },
    { label: "Essentials & Creed", prayers: essentials },
    { label: "Psalms", prayers: psalms },
    { label: "Intercession", prayers: intercession },
  ].filter((s) => s.prayers.length > 0 || (s.dynamic && s.dynamic.length > 0));
}

export default function PrayerPickerScreen() {
  const params = useLocalSearchParams<{ slot?: string }>();
  const slot: Slot = params.slot === "evening" ? "evening" : "morning";

  const [query, setQuery] = useState("");
  const [rule, setRule] = useState<PrayerRule | null>(null);
  // Soft confirmation for the user — a recently-added id flashes "Added".
  const [recentlyAdded, setRecentlyAdded] = useState<string | null>(null);

  useEffect(() => {
    getPrayerRule().then(setRule);
  }, []);

  const sections = useMemo(() => buildSections(slot, query), [slot, query]);

  const handleAdd = async (id: string) => {
    const next = await addPrayerToRule(slot, id);
    setRule(next);
    setRecentlyAdded(id);
    setTimeout(
      () => setRecentlyAdded((current) => (current === id ? null : current)),
      1200,
    );
  };

  const isInRule = (id: string) => Boolean(rule?.[slot].includes(id));

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "",
          headerBackTitle: "Rule",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.accent,
          headerShadowVisible: false,
          headerRight: () => (
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.doneButton,
                pressed && { opacity: 0.6 },
              ]}
              accessibilityRole="button"
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </Pressable>
          ),
        }}
      />
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Add to your {slot} rule</Text>
          <Text style={styles.title}>Prayer library</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search prayers"
            placeholderTextColor={colors.inkSoft}
            style={styles.input}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {sections.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[text.body, { textAlign: "center" }]}>
                No prayers match "{query}".
              </Text>
            </View>
          ) : (
            sections.map((section) => (
              <View key={section.label} style={styles.section}>
                <Text style={styles.sectionLabel}>{section.label}</Text>
                {section.dynamic?.map((dyn) => (
                  <PickerRow
                    key={dyn.id}
                    title={dyn.title}
                    subtitle={dyn.subtitle}
                    added={isInRule(dyn.id)}
                    flash={recentlyAdded === dyn.id}
                    dynamic
                    onAdd={() => handleAdd(dyn.id)}
                  />
                ))}
                {section.prayers.map((prayer) => (
                  <PickerRow
                    key={prayer.id}
                    title={prayer.title}
                    subtitle={prayer.subtitle ?? prayer.attribution}
                    preview={prayer.body.split("\n\n")[0]?.slice(0, 110)}
                    added={isInRule(prayer.id)}
                    flash={recentlyAdded === prayer.id}
                    onAdd={() => handleAdd(prayer.id)}
                  />
                ))}
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function PickerRow({
  title,
  subtitle,
  preview,
  added,
  flash,
  dynamic,
  onAdd,
}: {
  title: string;
  subtitle?: string;
  preview?: string;
  added: boolean;
  flash: boolean;
  dynamic?: boolean;
  onAdd: () => void;
}) {
  return (
    <View style={[styles.row, dynamic && styles.rowDynamic]}>
      <View style={styles.rowText}>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
        <Text style={styles.rowTitle}>{title}</Text>
        {preview ? (
          <Text style={styles.rowPreview} numberOfLines={2}>
            {preview}…
          </Text>
        ) : null}
      </View>
      <Pressable
        onPress={onAdd}
        hitSlop={8}
        style={({ pressed }) => [
          styles.addButton,
          added && styles.addButtonAdded,
          flash && styles.addButtonFlash,
          pressed && { opacity: 0.6 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={
          added ? `${title} already in rule. Add again.` : `Add ${title}`
        }
      >
        <Text
          style={[
            styles.addButtonGlyph,
            (added || flash) && styles.addButtonGlyphActive,
          ]}
        >
          {flash ? "✓" : added ? "+" : "+"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  doneButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  doneButtonText: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: "600",
  },

  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  eyebrow: {
    fontSize: 10.4,
    fontWeight: "500",
    color: colors.accent,
    letterSpacing: 2.4,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 26,
    color: colors.ink,
    letterSpacing: -0.4,
    lineHeight: 30,
  },
  input: {
    marginTop: spacing.xs,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    color: colors.ink,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing["4xl"],
    gap: spacing["2xl"],
  },

  section: { gap: spacing.sm },
  sectionLabel: {
    fontFamily: fonts.serif,
    fontSize: 18,
    color: colors.accent,
    letterSpacing: -0.2,
    marginBottom: spacing.xs,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  rowDynamic: {
    borderColor: "rgba(212, 168, 87, 0.3)",
    backgroundColor: "rgba(212, 168, 87, 0.06)",
  },
  rowText: { flex: 1, gap: 2 },
  rowSubtitle: {
    fontSize: 10.4,
    color: colors.inkSoft,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontWeight: "500",
  },
  rowTitle: {
    fontFamily: fonts.serif,
    fontSize: 17,
    color: colors.ink,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  rowPreview: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.inkSoft,
    marginTop: 4,
  },

  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonAdded: {
    backgroundColor: colors.accentSoft,
    borderColor: "rgba(212, 168, 87, 0.4)",
  },
  addButtonFlash: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  addButtonGlyph: {
    fontSize: 22,
    color: colors.inkMuted,
    lineHeight: 22,
    fontWeight: "300",
  },
  addButtonGlyphActive: {
    color: colors.background,
    fontWeight: "600",
  },

  emptyState: {
    paddingVertical: spacing["3xl"],
  },
});

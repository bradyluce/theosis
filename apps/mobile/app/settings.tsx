import { useQuery } from "@tanstack/react-query";
import * as Application from "expo-application";
import Constants from "expo-constants";
import { Stack, router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  FASTING_OPTIONS,
  JURISDICTION_OPTIONS,
  TRANSLATION_OPTIONS,
} from "@theosis/core/onboarding";

import { Pill } from "@/components/theosis/pill";
import { colors, fonts, radii, spacing, text } from "@/constants/theosis-theme";
import { getApi, getApiBaseUrl } from "@/lib/api";
import {
  type ProfilePrefs,
  getProfilePrefs,
  updateProfilePrefs,
} from "@/lib/preferences";

// Settings sub-page — accessed from the You tab. Preferences (patron
// saint, calendar system, commentary ranking) persist to AsyncStorage via
// updateProfilePrefs. About/version info stays here as the "deepest" page
// in the You stack.

const CALENDAR_OPTIONS: {
  value: NonNullable<ProfilePrefs["calendarSystem"]>;
  label: string;
  description: string;
}[] = [
  {
    value: "new",
    label: "New (Revised Julian)",
    description: "OCA, GOARCH, Antiochian US — most parishes worldwide.",
  },
  {
    value: "julian",
    label: "Old (Julian)",
    description: "ROCOR, Athonite, Russian/Serbian tradition.",
  },
];

const STATUS_OPTIONS: {
  value: NonNullable<ProfilePrefs["status"]>;
  label: string;
  description: string;
}[] = [
  {
    value: "christian",
    label: "Orthodox Christian",
    description: "Already received into the Orthodox Church.",
  },
  {
    value: "catechumen",
    label: "Catechumen",
    description: "Preparing for reception into the Church.",
  },
  {
    value: "inquirer",
    label: "Inquirer",
    description: "Exploring Orthodoxy and learning the faith.",
  },
];

const COMMENTARY_OPTIONS: {
  value: NonNullable<ProfilePrefs["commentaryRanking"]>;
  label: string;
  description: string;
}[] = [
  {
    value: "balanced",
    label: "Balanced",
    description: "Mix Fathers across eras; weight by relevance.",
  },
  {
    value: "ancient-first",
    label: "Ancient first",
    description: "Lead with pre-Nicene and Cappadocian Fathers.",
  },
  {
    value: "modern-first",
    label: "Modern first",
    description: "Lead with 19th–20th century commentary.",
  },
];

export default function SettingsScreen() {
  const api = getApi();
  const baseUrl = getApiBaseUrl();
  const versionQuery = useQuery({
    queryKey: ["version"],
    queryFn: () => api.fetchVersion(),
    staleTime: 60 * 1000,
  });

  const [prefs, setPrefs] = useState<ProfilePrefs>({});
  const [patronSaint, setPatronSaint] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [parish, setParish] = useState("");

  useEffect(() => {
    let canceled = false;
    getProfilePrefs().then((p) => {
      if (canceled) return;
      setPrefs(p);
      setPatronSaint(p.patronSaintSlug ?? "");
      setDisplayName(p.displayName ?? "");
      setParish(p.parish ?? "");
    });
    return () => {
      canceled = true;
    };
  }, []);

  const update = (patch: Partial<ProfilePrefs>) => {
    setPrefs((prev) => ({ ...prev, ...patch }));
    updateProfilePrefs(patch);
  };

  const appVersion =
    Application.nativeApplicationVersion ??
    Constants.expoConfig?.version ??
    "0.0.0";
  const buildNumber =
    Application.nativeBuildVersion ??
    Constants.expoConfig?.ios?.buildNumber ??
    "—";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Stack.Screen
        options={{
          title: "Settings",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.ink,
          headerShadowVisible: false,
        }}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.titleBlock}>
          <Text style={text.eyebrow}>Settings</Text>
          <Text style={styles.title}>Preferences</Text>
        </View>

        {/* Account — Phase 1 verification entry point. Temporary; the proper
            auth + onboarding UI lands in Phase 3. */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Account</Text>
          <Pressable
            onPress={() => router.push("/auth-debug")}
            style={({ pressed }) => [
              styles.linkCard,
              pressed && styles.linkCardPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Open auth debug"
          >
            <View style={styles.linkCardMain}>
              <Text style={styles.linkCardTitle}>Sign in / debug</Text>
              <Text style={styles.linkCardSubtitle}>
                Sign in with email + password and test the /api/me round-trip.
                Temporary — the proper sign-in flow ships with Phase 3 onboarding.
              </Text>
            </View>
            <Text style={styles.linkCardChevron}>›</Text>
          </Pressable>
        </View>

        {/* Profile — name + status. */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Profile</Text>
          <View style={styles.card}>
            <View style={styles.fieldLabelWrap}>
              <Text style={styles.fieldLabel}>Name</Text>
            </View>
            <TextInput
              value={displayName}
              onChangeText={(value) => {
                setDisplayName(value);
                update({ displayName: value.trim() || undefined });
              }}
              placeholder="Your name"
              placeholderTextColor={colors.inkSoft}
              autoCapitalize="words"
              autoCorrect={false}
              style={styles.input}
            />

            <View style={styles.fieldLabelWrap}>
              <Text style={styles.fieldLabel}>Parish</Text>
            </View>
            <TextInput
              value={parish}
              onChangeText={(value) => {
                setParish(value);
                update({ parish: value.trim() || undefined });
              }}
              placeholder="e.g. Holy Trinity Cathedral, Chicago"
              placeholderTextColor={colors.inkSoft}
              autoCapitalize="words"
              style={styles.input}
            />

            <View style={styles.fieldLabelWrap}>
              <Text style={styles.fieldLabel}>Status</Text>
            </View>
            {STATUS_OPTIONS.map((opt) => {
              const selected = prefs.status === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() =>
                    update({ status: selected ? undefined : opt.value })
                  }
                  style={({ pressed }) => [
                    styles.choiceRow,
                    selected && styles.choiceRowSelected,
                    pressed && !selected && { opacity: 0.7 },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <View style={styles.choiceText}>
                    <Text
                      style={[
                        styles.choiceLabel,
                        selected && styles.choiceLabelSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    <Text style={styles.choiceDesc}>{opt.description}</Text>
                  </View>
                  {selected ? <Text style={styles.checkGlyph}>✓</Text> : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Patron saint */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Patron saint</Text>
          <View style={styles.card}>
            <Text style={styles.body}>
              Your patron saint's commemoration is highlighted on Daily and
              their writings are weighted in commentary.
            </Text>
            <TextInput
              value={patronSaint}
              onChangeText={(value) => {
                setPatronSaint(value);
                update({ patronSaintSlug: value.trim() || undefined });
              }}
              placeholder="e.g. john-chrysostom"
              placeholderTextColor={colors.inkSoft}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
            <Text style={styles.hint}>
              Use the slug from the library URL (e.g. /people/john-chrysostom).
            </Text>
          </View>
        </View>

        {/* Calendar system */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Calendar</Text>
          <View style={styles.card}>
            {CALENDAR_OPTIONS.map((opt) => {
              const selected = (prefs.calendarSystem ?? "new") === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => update({ calendarSystem: opt.value })}
                  style={({ pressed }) => [
                    styles.choiceRow,
                    selected && styles.choiceRowSelected,
                    pressed && !selected && { opacity: 0.7 },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <View style={styles.choiceText}>
                    <Text
                      style={[
                        styles.choiceLabel,
                        selected && styles.choiceLabelSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    <Text style={styles.choiceDesc}>{opt.description}</Text>
                  </View>
                  {selected ? <Text style={styles.checkGlyph}>✓</Text> : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Jurisdiction */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Jurisdiction</Text>
          <View style={styles.card}>
            {JURISDICTION_OPTIONS.map((opt) => {
              const selected = prefs.jurisdiction === opt.code;
              return (
                <Pressable
                  key={opt.code}
                  onPress={() => update({ jurisdiction: opt.code })}
                  style={({ pressed }) => [
                    styles.choiceRow,
                    selected && styles.choiceRowSelected,
                    pressed && !selected && { opacity: 0.7 },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <View style={styles.choiceText}>
                    <Text
                      style={[
                        styles.choiceLabel,
                        selected && styles.choiceLabelSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {opt.description ? (
                      <Text style={styles.choiceDesc}>{opt.description}</Text>
                    ) : null}
                  </View>
                  {selected ? <Text style={styles.checkGlyph}>✓</Text> : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Primary translation */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Primary translation</Text>
          <View style={styles.card}>
            {TRANSLATION_OPTIONS.map((opt) => {
              const selected =
                (prefs.primaryTranslationId ?? "kjva") === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => update({ primaryTranslationId: opt.value })}
                  style={({ pressed }) => [
                    styles.choiceRow,
                    selected && styles.choiceRowSelected,
                    pressed && !selected && { opacity: 0.7 },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <View style={styles.choiceText}>
                    <Text
                      style={[
                        styles.choiceLabel,
                        selected && styles.choiceLabelSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    <Text style={styles.choiceDesc}>{opt.description}</Text>
                  </View>
                  {selected ? <Text style={styles.checkGlyph}>✓</Text> : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Fasting level */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Fasting level</Text>
          <View style={styles.card}>
            {FASTING_OPTIONS.map((opt) => {
              const selected =
                (prefs.fastingLevel ?? "standard") === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => update({ fastingLevel: opt.value })}
                  style={({ pressed }) => [
                    styles.choiceRow,
                    selected && styles.choiceRowSelected,
                    pressed && !selected && { opacity: 0.7 },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <View style={styles.choiceText}>
                    <Text
                      style={[
                        styles.choiceLabel,
                        selected && styles.choiceLabelSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    <Text style={styles.choiceDesc}>{opt.description}</Text>
                  </View>
                  {selected ? <Text style={styles.checkGlyph}>✓</Text> : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Commentary ranking */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Commentary ranking</Text>
          <View style={styles.card}>
            {COMMENTARY_OPTIONS.map((opt) => {
              const selected =
                (prefs.commentaryRanking ?? "balanced") === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => update({ commentaryRanking: opt.value })}
                  style={({ pressed }) => [
                    styles.choiceRow,
                    selected && styles.choiceRowSelected,
                    pressed && !selected && { opacity: 0.7 },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <View style={styles.choiceText}>
                    <Text
                      style={[
                        styles.choiceLabel,
                        selected && styles.choiceLabelSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    <Text style={styles.choiceDesc}>{opt.description}</Text>
                  </View>
                  {selected ? <Text style={styles.checkGlyph}>✓</Text> : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Practice</Text>
          <Pressable
            onPress={() => router.push("/prayer")}
            style={({ pressed }) => [
              styles.linkCard,
              pressed && styles.linkCardPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Open Prayer Rule"
          >
            <View style={styles.linkCardMain}>
              <Text style={styles.linkCardTitle}>Prayer Rule</Text>
              <Text style={styles.linkCardSubtitle}>
                Morning, evening, and the daily canons — coming soon.
              </Text>
            </View>
            <Text style={styles.linkCardChevron}>›</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>About</Text>
          <View style={styles.card}>
            <Text style={styles.body}>
              Theosis is a mobile-first Orthodox Christian study app:
              verse-first patristic commentary, daily liturgical rhythm, library
              of Fathers, and full-text search across centuries of Christian
              tradition.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>App version</Text>
          <View style={styles.card}>
            <KeyValue label="Version" value={appVersion} />
            <KeyValue label="Build" value={buildNumber} />
            <KeyValue label="Platform" value={Platform.OS} />
            {versionQuery.data ? (
              <>
                <KeyValue label="API commit" value={versionQuery.data.commit} />
                <KeyValue label="API branch" value={versionQuery.data.branch} />
                <KeyValue
                  label="API environment"
                  value={versionQuery.data.environment}
                />
              </>
            ) : null}
            <KeyValue label="API base" value={baseUrl} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Editorial policy</Text>
          <View style={styles.card}>
            <Text style={styles.body}>
              Every commentary entry carries provenance — source collection,
              translator, work title — visible in the commentary modal.
            </Text>
            <Text style={styles.body}>
              Icon and translation sources are public-domain / CC0 / CC BY where
              possible. CC BY-SA images are used for display only; we never
              ingest CC BY-SA prose.
            </Text>
            <View style={styles.pillRow}>
              <Pill variant="subtle">Public domain</Pill>
              <Pill variant="subtle">CC0</Pill>
              <Pill variant="subtle">CC BY</Pill>
              <Pill variant="subtle">CC BY-SA images</Pill>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Acknowledgments</Text>
          <View style={styles.card}>
            <Text style={styles.body}>
              Patristic commentary drawn from New Advent (newadvent.org), Catena
              Aurea (Aquinas, public domain), and the Nicene and Post-Nicene
              Fathers series. Bible text: KJVA (public domain). Saint icons via
              Wikimedia Commons.
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>Made with reverence. © 2026.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvKey}>{label}</Text>
      <Text style={styles.kvValue} numberOfLines={1} ellipsizeMode="middle">
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing["4xl"],
    gap: spacing["2xl"],
  },

  titleBlock: { gap: spacing.xs },
  title: {
    fontFamily: fonts.serif,
    fontSize: 32,
    color: colors.ink,
    letterSpacing: -0.5,
    lineHeight: 36,
  },

  section: { gap: spacing.sm },
  sectionLabel: {
    fontFamily: fonts.serif,
    fontSize: 18,
    color: colors.accent,
    letterSpacing: -0.2,
  },
  card: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  linkCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  linkCardPressed: { backgroundColor: colors.surfaceStrong },
  linkCardMain: { flex: 1, gap: 2 },
  linkCardTitle: {
    fontFamily: fonts.serif,
    fontSize: 18,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  linkCardSubtitle: {
    fontSize: 13,
    color: colors.inkMuted,
    lineHeight: 18,
  },
  linkCardChevron: { fontSize: 22, color: colors.inkSoft },
  body: {
    fontSize: 14,
    lineHeight: 23,
    color: colors.inkMuted,
  },
  hint: {
    fontSize: 12,
    color: colors.inkSoft,
    lineHeight: 18,
  },

  input: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.background,
    color: colors.ink,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: fonts.mono,
  },
  fieldLabelWrap: { marginTop: 4 },
  fieldLabel: {
    fontSize: 10.4,
    color: colors.inkSoft,
    letterSpacing: 2.4,
    textTransform: "uppercase",
    fontWeight: "500",
  },

  choiceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  choiceRowSelected: {
    borderColor: "rgba(212, 168, 87, 0.5)",
    backgroundColor: colors.accentSoft,
  },
  choiceText: { flex: 1, gap: 4 },
  choiceLabel: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.ink,
  },
  choiceLabelSelected: { color: colors.accent },
  choiceDesc: {
    fontSize: 12,
    color: colors.inkMuted,
    lineHeight: 18,
  },
  checkGlyph: {
    fontSize: 18,
    color: colors.accent,
    fontWeight: "700",
  },

  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },

  kvRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  kvKey: {
    fontSize: 12.5,
    color: colors.inkSoft,
    letterSpacing: 0.4,
  },
  kvValue: {
    fontFamily: fonts.mono,
    fontSize: 12.5,
    color: colors.ink,
    flexShrink: 1,
    textAlign: "right",
  },

  footer: {
    fontSize: 11,
    color: colors.inkSoft,
    textAlign: "center",
    paddingTop: spacing.lg,
    fontStyle: "italic",
  },
});

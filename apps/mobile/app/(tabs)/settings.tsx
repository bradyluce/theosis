import { useQuery } from "@tanstack/react-query";
import * as Application from "expo-application";
import Constants from "expo-constants";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Pill } from "@/components/theosis/pill";
import { colors, fonts, radii, spacing, text } from "@/constants/theosis-theme";
import { getApi, getApiBaseUrl } from "@/lib/api";

// Settings / About tab. Today this is read-only — version info, editorial
// policy, attribution links. Preference toggles (font size, default
// translation, theme overrides) come when there's something for them to
// drive; until then a static About page is less misleading than a
// "Coming soon" surface.

export default function SettingsScreen() {
  const api = getApi();
  const baseUrl = getApiBaseUrl();
  const versionQuery = useQuery({
    queryKey: ["version"],
    queryFn: () => api.fetchVersion(),
    staleTime: 60 * 1000,
  });

  const appVersion =
    Application.nativeApplicationVersion ??
    Constants.expoConfig?.version ??
    "0.0.0";
  const buildNumber =
    Application.nativeBuildVersion ?? Constants.expoConfig?.ios?.buildNumber ?? "—";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleBlock}>
          <Text style={text.eyebrow}>Settings</Text>
          <Text style={styles.title}>Theosis</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>About</Text>
          <View style={styles.card}>
            <Text style={styles.body}>
              Theosis is a mobile-first Orthodox Christian study app: verse-first
              patristic commentary, daily liturgical rhythm, library of Fathers,
              and full-text search across centuries of Christian tradition.
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
              Patristic commentary drawn from New Advent (newadvent.org),
              Catena Aurea (Aquinas, public domain), and the Nicene and
              Post-Nicene Fathers series. Bible text: KJVA (public domain).
              Saint icons via Wikimedia Commons.
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Made with reverence. © 2026.
        </Text>
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
  body: {
    fontSize: 14,
    lineHeight: 23,
    color: colors.inkMuted,
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

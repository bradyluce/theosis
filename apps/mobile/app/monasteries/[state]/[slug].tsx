import Feather from "@expo/vector-icons/Feather";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { MonasteryCommunityType } from "@theosis/core";

import {
  Eyebrow,
  GiltRule,
  SectionHeader,
} from "@/components/theosis/primitives";
import { colors, fonts, radii, spacing, text } from "@/constants/theosis-theme";
import { getApi } from "@/lib/api";

// Monastery detail screen — pushed from the monasteries list. Reachable at
// /monasteries/<state>/<slug>. Renders the full Monastery record returned by
// /api/monasteries/[state]/[slug]: community type (men's/women's), address
// with map deep-link, contact actions where available, plus diocese /
// superior / dedication / founded-year metadata when present.
//
// Action links use platform-native deep-link schemes (maps://, tel:, https),
// each guarded by canOpenURL to degrade gracefully.

function communityLabel(t: MonasteryCommunityType): string {
  return t === "male"
    ? "Men's Monastery"
    : t === "female"
      ? "Women's Monastery"
      : "Monastery";
}

export default function MonasteryDetailScreen() {
  const params = useLocalSearchParams<{ state: string; slug: string }>();
  const state = params.state;
  const slug = params.slug;
  const api = getApi();

  const query = useQuery({
    queryKey: ["monastery-detail", state, slug],
    queryFn: () => api.fetchMonasteryDetail(state as string, slug as string),
    enabled: Boolean(state && slug),
    staleTime: 60 * 60 * 1000, // detail rarely changes
  });

  const monastery = query.data;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "",
          headerBackTitle: "Monasteries",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.accent,
          headerShadowVisible: false,
          headerTransparent: false,
        }}
      />
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
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

        {query.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : null}

        {query.error ? (
          <View style={styles.errorWrap}>
            <Eyebrow tone="oxblood">Couldn&apos;t load monastery</Eyebrow>
            <Text
              style={[text.body, { color: colors.error, marginTop: spacing.sm }]}
            >
              {query.error instanceof Error
                ? query.error.message
                : String(query.error)}
            </Text>
          </View>
        ) : null}

        {monastery ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <Eyebrow tone="accent">{monastery.jurisdictionLabel}</Eyebrow>
              <Text style={styles.title}>{monastery.name}</Text>
              {monastery.diocese ? (
                <Text style={styles.dioceseLabel}>{monastery.diocese}</Text>
              ) : null}

              {/* Community-type badge — the monastic counterpart to the
                  parish "your parish" pill, but informational. */}
              <View style={styles.communityRow}>
                <View style={styles.communityBadge}>
                  <Feather
                    name="home"
                    size={12}
                    color={colors.accent}
                  />
                  <Text style={styles.communityBadgeText}>
                    {communityLabel(monastery.communityType)}
                  </Text>
                </View>
              </View>

              <GiltRule full style={{ marginTop: spacing.lg }} />
            </View>

            {/* Address + Open in Maps */}
            <View style={styles.section}>
              <SectionHeader eyebrow="Location" title="Address" rule />
              <View style={styles.addressBlock}>
                {monastery.address.street ? (
                  <Text style={styles.addressLine}>{monastery.address.street}</Text>
                ) : null}
                <Text style={styles.addressLine}>
                  {monastery.address.city}, {monastery.address.state}{" "}
                  {monastery.address.zip}
                </Text>
              </View>
              <ActionButton
                icon="map"
                label="Open in Maps"
                onPress={() =>
                  openInMaps(monastery.name, monastery.geo, monastery.address)
                }
              />
            </View>

            {/* Contact actions — usually absent from the directory grid, but
                rendered when a richer source fills them in. */}
            {monastery.contact.phone ||
            monastery.contact.website ||
            monastery.contact.email ? (
              <View style={styles.section}>
                <SectionHeader eyebrow="Reach out" title="Contact" rule />
                {monastery.contact.phone ? (
                  <ActionButton
                    icon="phone"
                    label={formatPhone(monastery.contact.phone)}
                    onPress={() => callPhone(monastery.contact.phone!)}
                  />
                ) : null}
                {monastery.contact.website ? (
                  <ActionButton
                    icon="globe"
                    label={prettyHost(monastery.contact.website)}
                    onPress={() => openExternal(monastery.contact.website!)}
                  />
                ) : null}
                {monastery.contact.email ? (
                  <ActionButton
                    icon="mail"
                    label={monastery.contact.email}
                    onPress={() =>
                      openExternal(`mailto:${monastery.contact.email}`)
                    }
                  />
                ) : null}
              </View>
            ) : null}

            {/* About — superior / dedication / founded, when known. */}
            {monastery.superior || monastery.dedication || monastery.foundedYear ? (
              <View style={styles.section}>
                <SectionHeader eyebrow="The community" title="About" rule />
                <View style={styles.aboutBlock}>
                  {monastery.dedication ? (
                    <Text style={styles.aboutLine}>
                      Dedicated to {monastery.dedication}
                    </Text>
                  ) : null}
                  {monastery.superior ? (
                    <Text style={styles.aboutLine}>{monastery.superior}</Text>
                  ) : null}
                  {monastery.foundedYear ? (
                    <Text style={styles.aboutLine}>
                      Founded {monastery.foundedYear}
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : null}

            {/* Footer meta */}
            <View style={[styles.section, styles.footer]}>
              <Text style={styles.metaLine}>
                Source: {monastery.sources.join(", ")}
              </Text>
            </View>
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </>
  );
}

// --- Action button ---------------------------------------------------------

function ActionButton({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        pressed && styles.actionButtonPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Feather name={icon} size={16} color={colors.accent} />
      <Text style={styles.actionLabel} numberOfLines={1}>
        {label}
      </Text>
      <Feather name="external-link" size={14} color={colors.inkSoft} />
    </Pressable>
  );
}

// --- Deep-link helpers -----------------------------------------------------

async function openInMaps(
  name: string,
  geo: { lat: number; lng: number },
  address: { street: string; city: string; state: string; zip: string },
) {
  const label = encodeURIComponent(name);
  const query = encodeURIComponent(
    `${address.street}, ${address.city}, ${address.state} ${address.zip}`,
  );
  const candidates =
    Platform.OS === "ios"
      ? [
          `maps://?q=${label}&ll=${geo.lat},${geo.lng}`,
          `https://maps.apple.com/?q=${label}&ll=${geo.lat},${geo.lng}`,
          `https://www.google.com/maps/search/?api=1&query=${query}`,
        ]
      : [
          `geo:${geo.lat},${geo.lng}?q=${query}(${label})`,
          `https://www.google.com/maps/search/?api=1&query=${query}`,
        ];
  for (const url of candidates) {
    const ok = await Linking.canOpenURL(url).catch(() => false);
    if (ok) {
      Linking.openURL(url).catch(() => {});
      return;
    }
  }
}

function callPhone(phone: string) {
  Linking.openURL(`tel:${phone}`).catch(() => {});
}

function openExternal(url: string) {
  Linking.openURL(url).catch(() => {});
}

// --- Display helpers -------------------------------------------------------

function formatPhone(raw: string): string {
  if (raw.startsWith("+1") && raw.length === 12) {
    return `+1 (${raw.slice(2, 5)}) ${raw.slice(5, 8)}-${raw.slice(8)}`;
  }
  if (raw.length === 10 && /^\d+$/.test(raw)) {
    return `(${raw.slice(0, 3)}) ${raw.slice(3, 6)}-${raw.slice(6)}`;
  }
  return raw;
}

function prettyHost(url: string): string {
  try {
    const u = new URL(url);
    return (
      u.host.replace(/^www\./, "") +
      (u.pathname !== "/" ? u.pathname.replace(/\/$/, "") : "")
    );
  } catch {
    return url;
  }
}

// --- Styles ----------------------------------------------------------------

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 120 },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorWrap: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  title: {
    ...text.titleXl,
    marginTop: spacing.sm,
  },
  dioceseLabel: {
    ...text.byline,
    marginTop: spacing.xs,
    color: colors.inkMuted,
  },
  communityRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.lg,
  },
  communityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
    backgroundColor: colors.accentSoft,
  },
  communityBadgeText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  addressBlock: {
    gap: 2,
  },
  addressLine: {
    ...text.bodyLong,
  },
  aboutBlock: {
    gap: spacing.xs,
  },
  aboutLine: {
    ...text.bodyLong,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
  },
  actionButtonPressed: {
    backgroundColor: colors.surfaceStrong,
  },
  actionLabel: {
    ...text.bodyStrong,
    flex: 1,
  },
  footer: {
    paddingBottom: spacing.xl,
    gap: 4,
  },
  metaLine: {
    ...text.byline,
    fontSize: 12,
    color: colors.inkSoft,
  },
});

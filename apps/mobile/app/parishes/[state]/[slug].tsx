import Feather from "@expo/vector-icons/Feather";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  Eyebrow,
  GiltRule,
  SectionHeader,
} from "@/components/theosis/primitives";
import { colors, fonts, radii, spacing, text } from "@/constants/theosis-theme";
import { getApi } from "@/lib/api";
import { getProfilePrefs, updateProfilePrefs } from "@/lib/preferences";

// Parish detail screen — pushed from the parishes list. Reachable at
// /parishes/<state>/<slug>. Renders the full Parish record returned by
// /api/parishes/[state]/[slug]: address with map deep-link, phone (tap to
// call), website (tap to open), clergy + languages + services where
// available, plus diocese / founded-year metadata.
//
// Action links use platform-native deep-link schemes:
//   - "Open in Maps" → maps:// on iOS, geo: / google.com/maps on Android
//   - "Call" → tel:
//   - "Visit website" → opens browser
// Each guarded by canOpenURL to gracefully degrade if the scheme isn't
// available (e.g. Maps app uninstalled).

export default function ParishDetailScreen() {
  const params = useLocalSearchParams<{ state: string; slug: string }>();
  const state = params.state;
  const slug = params.slug;
  const api = getApi();

  const query = useQuery({
    queryKey: ["parish-detail", state, slug],
    queryFn: () => api.fetchParishDetail(state as string, slug as string),
    enabled: Boolean(state && slug),
    staleTime: 60 * 60 * 1000, // detail rarely changes
  });

  const parish = query.data;

  // Track whether this parish is the user's currently-set home parish so
  // the action button can flip between "Set as my parish" and a quiet
  // confirmation. Re-read on focus so the state stays accurate after
  // round-trips to other screens.
  const [savedParishName, setSavedParishName] = useState<string | undefined>(
    undefined,
  );
  useFocusEffect(
    useCallback(() => {
      let canceled = false;
      void getProfilePrefs().then((p) => {
        if (!canceled) setSavedParishName(p.parish);
      });
      return () => {
        canceled = true;
      };
    }, []),
  );
  const isMyParish =
    Boolean(parish) && savedParishName === parish?.name;

  async function handleSetAsMyParish() {
    if (!parish) return;
    await updateProfilePrefs({ parish: parish.name });
    setSavedParishName(parish.name);
    // Pop back to whatever the user was doing before — the parishes
    // list, or the onboarding/settings parish field. router.back gets
    // them out of the detail; router.back again unwinds the list step
    // if they came from there. Wrapped in setTimeout so the user sees
    // the success state momentarily.
    setTimeout(() => {
      if (router.canGoBack()) {
        router.back();
        if (router.canGoBack()) router.back();
      }
    }, 600);
  }

  function handleUnsetMyParish() {
    Alert.alert(
      "Remove your parish?",
      `${parish?.name} will no longer be saved as your home parish.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            await updateProfilePrefs({ parish: undefined });
            setSavedParishName(undefined);
          },
        },
      ],
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "",
          headerBackTitle: "Parishes",
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
            <Eyebrow tone="oxblood">Couldn&apos;t load parish</Eyebrow>
            <Text
              style={[text.body, { color: colors.error, marginTop: spacing.sm }]}
            >
              {query.error instanceof Error
                ? query.error.message
                : String(query.error)}
            </Text>
          </View>
        ) : null}

        {parish ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <Eyebrow tone="accent">{parish.jurisdictionLabel}</Eyebrow>
              <Text style={styles.title}>{parish.name}</Text>
              {parish.diocese ? (
                <Text style={styles.dioceseLabel}>{parish.diocese}</Text>
              ) : null}

              {/* Primary CTA — set this parish as the user's home parish.
                  When it's already saved, switch to a quiet confirmation
                  pill with an "unset" affordance. */}
              {isMyParish ? (
                <View style={styles.myParishRow}>
                  <View style={styles.myParishBadge}>
                    <Feather name="check" size={13} color={colors.background} />
                    <Text style={styles.myParishBadgeText}>Your parish</Text>
                  </View>
                  <Pressable
                    onPress={handleUnsetMyParish}
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.unsetButton,
                      pressed && { opacity: 0.6 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Remove this parish"
                  >
                    <Text style={styles.unsetLabel}>Remove</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={handleSetAsMyParish}
                  style={({ pressed }) => [
                    styles.setAsParishButton,
                    pressed && { opacity: 0.85 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Set as my parish"
                >
                  <Feather
                    name="home"
                    size={14}
                    color={colors.background}
                  />
                  <Text style={styles.setAsParishLabel}>Set as my parish</Text>
                </Pressable>
              )}

              <GiltRule full style={{ marginTop: spacing.lg }} />
            </View>

            {/* Address + Open in Maps */}
            <View style={styles.section}>
              <SectionHeader eyebrow="Location" title="Address" rule />
              <View style={styles.addressBlock}>
                <Text style={styles.addressLine}>{parish.address.street}</Text>
                <Text style={styles.addressLine}>
                  {parish.address.city}, {parish.address.state}{" "}
                  {parish.address.zip}
                </Text>
              </View>
              <ActionButton
                icon="map"
                label="Open in Maps"
                onPress={() => openInMaps(parish.name, parish.geo, parish.address)}
              />
            </View>

            {/* Contact actions */}
            {parish.contact.phone || parish.contact.website || parish.contact.email ? (
              <View style={styles.section}>
                <SectionHeader eyebrow="Reach out" title="Contact" rule />
                {parish.contact.phone ? (
                  <ActionButton
                    icon="phone"
                    label={formatPhone(parish.contact.phone)}
                    onPress={() => callPhone(parish.contact.phone!)}
                  />
                ) : null}
                {parish.contact.website ? (
                  <ActionButton
                    icon="globe"
                    label={prettyHost(parish.contact.website)}
                    onPress={() => openExternal(parish.contact.website!)}
                  />
                ) : null}
                {parish.contact.email ? (
                  <ActionButton
                    icon="mail"
                    label={parish.contact.email}
                    onPress={() => openExternal(`mailto:${parish.contact.email}`)}
                  />
                ) : null}
              </View>
            ) : null}

            {/* Clergy — empty in Assembly source today; will populate when
                jurisdiction-specific scrapers land */}
            {parish.clergy.length > 0 ? (
              <View style={styles.section}>
                <SectionHeader eyebrow="Serving" title="Clergy" rule />
                <View style={styles.list}>
                  {parish.clergy.map((c, i) => (
                    <View key={`${c.name}-${i}`} style={styles.clergyRow}>
                      <Feather name="user" size={14} color={colors.accent} />
                      <View style={styles.clergyText}>
                        <Text style={styles.clergyName}>
                          {c.title ? `${c.title} ` : ""}
                          {c.name}
                        </Text>
                        <Text style={styles.clergyRole}>{c.role}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Services — also empty in Assembly source today */}
            {parish.services?.raw || parish.services?.weekly?.length ? (
              <View style={styles.section}>
                <SectionHeader eyebrow="Worship" title="Services" rule />
                {parish.services.raw ? (
                  <Text style={styles.serviceRaw}>{parish.services.raw}</Text>
                ) : null}
                {parish.services.weekly?.length ? (
                  <View style={styles.list}>
                    {parish.services.weekly.map((s, i) => (
                      <View key={i} style={styles.serviceRow}>
                        <Text style={styles.serviceWeekday}>
                          {weekdayName(s.weekday)}
                        </Text>
                        <Text style={styles.serviceTime}>{s.timeLabel}</Text>
                        <Text style={styles.serviceName}>{s.service}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Languages */}
            {parish.languages.length > 0 ? (
              <View style={styles.section}>
                <SectionHeader eyebrow="Liturgical" title="Languages" rule />
                <View style={styles.chipRow}>
                  {parish.languages.map((lang) => (
                    <View key={lang} style={styles.chip}>
                      <Text style={styles.chipLabel}>{lang}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Footer meta */}
            <View style={[styles.section, styles.footer]}>
              {parish.foundedYear ? (
                <Text style={styles.metaLine}>
                  Founded {parish.foundedYear}
                </Text>
              ) : null}
              <Text style={styles.metaLine}>
                Source: {parish.sources.join(", ")}
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
  parishName: string,
  geo: { lat: number; lng: number },
  address: { street: string; city: string; state: string; zip: string },
) {
  // Build a fallback chain. Native apps fail open → universal http URL.
  const label = encodeURIComponent(parishName);
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
  // "+12122260499" → "+1 (212) 226-0499"
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
    return u.host.replace(/^www\./, "") + (u.pathname !== "/" ? u.pathname.replace(/\/$/, "") : "");
  } catch {
    return url;
  }
}

function weekdayName(idx: number): string {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][idx] ?? "?";
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
  setAsParishButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  setAsParishLabel: {
    fontFamily: fonts.serif,
    fontSize: 14,
    fontWeight: "600",
    color: colors.background,
    letterSpacing: 0.4,
  },
  myParishRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  myParishBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  myParishBadgeText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: "700",
    color: colors.background,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  unsetButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  unsetLabel: {
    fontFamily: fonts.serif,
    fontSize: 12,
    color: colors.oxbloodInk,
    fontStyle: "italic",
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
  list: {
    gap: spacing.sm,
  },
  // Action button — pill row, icon + label + ext-link glyph
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
  clergyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  clergyText: { flex: 1, gap: 2 },
  clergyName: { ...text.bodyStrong },
  clergyRole: { ...text.byline, fontSize: 12, color: colors.inkSoft },
  serviceRaw: {
    ...text.bodyLong,
    fontStyle: "italic",
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  serviceWeekday: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    width: 44,
  },
  serviceTime: {
    ...text.body,
    width: 72,
  },
  serviceName: { ...text.bodyStrong, flex: 1 },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
    backgroundColor: "rgba(212, 168, 87, 0.06)",
  },
  chipLabel: {
    fontFamily: fonts.sans,
    fontSize: 12,
    fontWeight: "600",
    color: colors.ink,
    letterSpacing: 0.5,
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

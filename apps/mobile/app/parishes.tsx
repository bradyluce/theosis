import Feather from "@expo/vector-icons/Feather";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { Stack, router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NearbyParish } from "@theosis/core";

import {
  Eyebrow,
  GiltRule,
  SectionHeader,
} from "@/components/theosis/primitives";
import { colors, fonts, radii, spacing, text } from "@/constants/theosis-theme";
import { getApi } from "@/lib/api";

// Parishes — "find a parish near me" surface, gated by location permission.
//
// Permission state machine:
//   - undetermined (first load):     show CTA card with "Find parishes" button
//                                    → tap fires requestPermissionAsync
//   - granted, no fix yet:           getLastKnownPosition (fast) → fall back
//                                    to getCurrentPositionAsync (slow but fresh)
//   - granted, fix obtained:         render the parish list
//   - denied (can ask again):        show "permission needed" + retry CTA
//   - denied permanently (! can ask):show settings-link guidance
//   - location-fetch error:          show error + retry
//
// We cache the obtained coords in component state and never re-prompt or
// re-fetch on remount — getLastKnownPosition is essentially instant when
// permission is held. React Query memoizes the /api/parishes/near response
// keyed on the rounded coords.

const DEFAULT_RADIUS_MI = 50;
const LIMIT = 50;

const RADIUS_OPTIONS = [10, 25, 50, 100, 200] as const;
type RadiusOption = (typeof RADIUS_OPTIONS)[number];

// All 12 canonical jurisdiction codes. Order roughly by US parish count
// (largest first) so the chip row reads naturally left-to-right.
const ALL_JURISDICTIONS: { code: string; short: string }[] = [
  { code: "goa", short: "Greek" },
  { code: "oca", short: "OCA" },
  { code: "ant", short: "Antiochian" },
  { code: "roc", short: "ROCOR" },
  { code: "ser", short: "Serbian" },
  { code: "ukr", short: "Ukrainian" },
  { code: "cpr", short: "Carpatho" },
  { code: "mos", short: "Moscow" },
  { code: "rom", short: "Romanian" },
  { code: "bgr", short: "Bulgarian" },
  { code: "geo", short: "Georgian" },
  { code: "alb", short: "Albanian" },
];

// Round to ~1km so small step changes don't bust the React Query cache.
function roundCoord(v: number): number {
  return Math.round(v * 100) / 100;
}

// Nominatim returns long display strings like
// "10001, Manhattan, New York County, New York, United States". For UI
// labels we keep just the first 2-3 segments.
function prettyGeocodeLabel(label: string): string {
  const parts = label.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length <= 3) return parts.join(", ");
  return parts.slice(0, 3).join(", ");
}

type Origin = { lat: number; lng: number };

type LocationState =
  | { kind: "idle" }
  | { kind: "requesting" }
  | { kind: "fetching" }
  // ready may come from device location (no label) or from a manual ZIP
  // entry (label set to the geocoder's display name).
  | { kind: "ready"; origin: Origin; label?: string }
  | { kind: "denied"; canAskAgain: boolean }
  | { kind: "error"; message: string };

export default function ParishesScreen() {
  const api = getApi();
  const [permission, requestPermission] = Location.useForegroundPermissions();
  const [state, setState] = useState<LocationState>({ kind: "idle" });

  // Manual-entry UI is hidden by default; user reveals it via the "Or
  // enter a ZIP" link beneath each gate card. Tracked separately from
  // LocationState because it's a UI affordance, not a state of the
  // origin-acquisition process.
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  // Filter state — lifted here so the controls render above the list and
  // both share a single source of truth. Empty jurisdictions array means
  // "all" (no filter); we never persist an empty selection.
  const [radiusMi, setRadiusMi] = useState<RadiusOption>(DEFAULT_RADIUS_MI);
  const [selectedJurisdictions, setSelectedJurisdictions] = useState<string[]>(
    [],
  );

  const submitManualLocation = useCallback(async () => {
    const q = manualInput.trim();
    if (!q) return;
    setManualSubmitting(true);
    setManualError(null);
    Keyboard.dismiss();
    try {
      const result = await api.geocode(q);
      setState({
        kind: "ready",
        origin: {
          lat: roundCoord(result.lat),
          lng: roundCoord(result.lng),
        },
        // Trim to first comma — keeps the header readable ("10001"
        // instead of "10001, Manhattan, New York County, ...").
        label: prettyGeocodeLabel(result.label),
      });
      setShowManualEntry(false);
      setManualInput("");
    } catch (err) {
      setManualError(err instanceof Error ? err.message : String(err));
    } finally {
      setManualSubmitting(false);
    }
  }, [api, manualInput]);

  // Once we have a location (device or manual), tapping "Use a different
  // location" returns to the manual-entry surface without dropping the
  // permission state. Useful for users who want to browse another city.
  const switchToManual = useCallback(() => {
    setShowManualEntry(true);
    setManualError(null);
  }, []);

  const toggleJurisdiction = useCallback((code: string) => {
    setSelectedJurisdictions((current) =>
      current.includes(code)
        ? current.filter((j) => j !== code)
        : [...current, code],
    );
  }, []);

  const clearJurisdictionFilter = useCallback(() => {
    setSelectedJurisdictions([]);
  }, []);

  // The fix-acquisition routine, broken out so we can call it both on
  // first grant and on user retry. Uses last-known if available (instant);
  // falls back to a fresh fix (a few seconds, may prompt OS location services).
  const acquireLocation = useCallback(async () => {
    setState({ kind: "fetching" });
    try {
      const lastKnown = await Location.getLastKnownPositionAsync({
        maxAge: 5 * 60 * 1000, // 5 min — accept anything reasonably recent
      });
      if (lastKnown) {
        setState({
          kind: "ready",
          origin: {
            lat: roundCoord(lastKnown.coords.latitude),
            lng: roundCoord(lastKnown.coords.longitude),
          },
        });
        return;
      }
      const fresh = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setState({
        kind: "ready",
        origin: {
          lat: roundCoord(fresh.coords.latitude),
          lng: roundCoord(fresh.coords.longitude),
        },
      });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  // React to permission status: as soon as it transitions to granted,
  // try to get a fix. If denied, surface the denial state. Undetermined
  // stays idle — the user has to tap to ask.
  //
  // The effect synchronizes the OS-owned permission state with our React
  // state — exactly the cross-system bridge useEffect is meant for. The
  // setState calls inside are gated by a kind check so we never re-trigger
  // unnecessarily; eslint's set-state-in-effect rule fires on the literal
  // pattern but this is the correct shape here.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!permission) return;
    if (state.kind !== "idle" && state.kind !== "requesting" && state.kind !== "denied") {
      // Already ready/fetching/error — don't re-trigger.
      return;
    }
    if (permission.status === "granted") {
      acquireLocation();
    } else if (permission.status === "denied") {
      setState({ kind: "denied", canAskAgain: permission.canAskAgain });
    }
    // status "undetermined" → stay idle, wait for user tap.
  }, [permission, acquireLocation, state.kind]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleEnableTap = useCallback(async () => {
    setState({ kind: "requesting" });
    const result = await requestPermission();
    if (result.granted) {
      await acquireLocation();
    } else {
      setState({ kind: "denied", canAskAgain: result.canAskAgain });
    }
  }, [requestPermission, acquireLocation]);

  const handleOpenSettings = useCallback(() => {
    Linking.openSettings().catch(() => {});
  }, []);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "",
          headerBackTitle: "Back",
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
          locations={[0, 0.3, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header — title reflects how we got the origin: device
              location ("Near you") vs manual ZIP ("Lower Manhattan, NY"). */}
          <View style={styles.header}>
            <Eyebrow tone="accent">Find a parish</Eyebrow>
            <Text style={styles.title}>
              {state.kind === "ready" && state.label ? state.label : "Near you"}
            </Text>
            <GiltRule full style={{ marginTop: spacing.lg }} />
          </View>

          {/* Permission gate */}
          {state.kind === "idle" && !showManualEntry ? (
            <PermissionCta
              onEnable={handleEnableTap}
              onUseManualEntry={() => setShowManualEntry(true)}
            />
          ) : null}

          {state.kind === "requesting" || state.kind === "fetching" ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.loadingLabel}>
                {state.kind === "requesting"
                  ? "Requesting permission..."
                  : "Finding your location..."}
              </Text>
            </View>
          ) : null}

          {state.kind === "denied" && !showManualEntry ? (
            <PermissionDenied
              canAskAgain={state.canAskAgain}
              onRetry={handleEnableTap}
              onUseManualEntry={() => setShowManualEntry(true)}
              onOpenSettings={handleOpenSettings}
            />
          ) : null}

          {state.kind === "error" && !showManualEntry ? (
            <LocationError
              message={state.message}
              onRetry={acquireLocation}
              onUseManualEntry={() => setShowManualEntry(true)}
            />
          ) : null}

          {/* Manual entry sheet — shown when user taps "Or enter a ZIP"
              from any gate, or when they tap "Use a different location"
              after a successful fetch. */}
          {showManualEntry ? (
            <ManualLocationEntry
              value={manualInput}
              onChange={setManualInput}
              onSubmit={submitManualLocation}
              onCancel={() => {
                setShowManualEntry(false);
                setManualInput("");
                setManualError(null);
              }}
              submitting={manualSubmitting}
              error={manualError}
              // "Cancel" button changes copy based on whether the user has
              // an existing origin to fall back to — if not, dismissing
              // would return them to the gate they came from.
              hasExistingOrigin={state.kind === "ready"}
            />
          ) : null}

          {state.kind === "ready" && !showManualEntry ? (
            <>
              <FilterControls
                radiusMi={radiusMi}
                onRadiusChange={setRadiusMi}
                selectedJurisdictions={selectedJurisdictions}
                onToggleJurisdiction={toggleJurisdiction}
                onClearJurisdictions={clearJurisdictionFilter}
              />
              <View style={styles.section}>
                <Pressable
                  onPress={switchToManual}
                  hitSlop={6}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.useDifferentLink,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Feather name="edit-2" size={12} color={colors.accent} />
                  <Text style={styles.useDifferentLabel}>
                    Use a different location
                  </Text>
                </Pressable>
              </View>
              <ParishList
                origin={state.origin}
                radiusMi={radiusMi}
                jurisdictions={selectedJurisdictions}
              />
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

// --- Sub-components --------------------------------------------------------

function PermissionCta({
  onEnable,
  onUseManualEntry,
}: {
  onEnable: () => void;
  onUseManualEntry: () => void;
}) {
  return (
    <View style={styles.ctaCard}>
      <Feather name="map-pin" size={32} color={colors.accent} />
      <Text style={styles.ctaTitle}>Allow location access</Text>
      <Text style={styles.ctaBody}>
        Theosis uses your location to find Orthodox parishes near you. Your
        coordinates are only used to compute distances — they aren&apos;t
        saved or used to identify you.
      </Text>
      <Pressable
        onPress={onEnable}
        style={({ pressed }) => [
          styles.ctaButton,
          pressed && styles.ctaButtonPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Enable location to find parishes near you"
      >
        <Text style={styles.ctaButtonLabel}>Find parishes near me</Text>
      </Pressable>
      <Pressable onPress={onUseManualEntry} hitSlop={6}>
        <Text style={styles.ctaSecondaryLabel}>Or enter a ZIP or city</Text>
      </Pressable>
    </View>
  );
}

function PermissionDenied({
  canAskAgain,
  onRetry,
  onOpenSettings,
  onUseManualEntry,
}: {
  canAskAgain: boolean;
  onRetry: () => void;
  onOpenSettings: () => void;
  onUseManualEntry: () => void;
}) {
  return (
    <View style={styles.ctaCard}>
      <Feather name="alert-circle" size={32} color={colors.oxbloodInk} />
      <Text style={styles.ctaTitle}>Location permission needed</Text>
      <Text style={styles.ctaBody}>
        {canAskAgain
          ? "We need access to your location to find parishes near you."
          : `You've denied location access. To find parishes near you, enable location for Theosis in ${Platform.OS === "ios" ? "Settings" : "your device settings"}.`}
      </Text>
      {canAskAgain ? (
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => [
            styles.ctaButton,
            pressed && styles.ctaButtonPressed,
          ]}
          accessibilityRole="button"
        >
          <Text style={styles.ctaButtonLabel}>Try again</Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={onOpenSettings}
          style={({ pressed }) => [
            styles.ctaButton,
            pressed && styles.ctaButtonPressed,
          ]}
          accessibilityRole="button"
        >
          <Text style={styles.ctaButtonLabel}>Open settings</Text>
        </Pressable>
      )}
      <Pressable onPress={onUseManualEntry} hitSlop={6}>
        <Text style={styles.ctaSecondaryLabel}>Or enter a ZIP or city</Text>
      </Pressable>
    </View>
  );
}

function LocationError({
  message,
  onRetry,
  onUseManualEntry,
}: {
  message: string;
  onRetry: () => void;
  onUseManualEntry: () => void;
}) {
  return (
    <View style={styles.ctaCard}>
      <Feather name="x-circle" size={32} color={colors.oxbloodInk} />
      <Text style={styles.ctaTitle}>Couldn&apos;t get your location</Text>
      <Text style={styles.ctaBody}>{message}</Text>
      <Pressable
        onPress={onRetry}
        style={({ pressed }) => [
          styles.ctaButton,
          pressed && styles.ctaButtonPressed,
        ]}
        accessibilityRole="button"
      >
        <Text style={styles.ctaButtonLabel}>Try again</Text>
      </Pressable>
      <Pressable onPress={onUseManualEntry} hitSlop={6}>
        <Text style={styles.ctaSecondaryLabel}>Or enter a ZIP or city</Text>
      </Pressable>
    </View>
  );
}

function ManualLocationEntry({
  value,
  onChange,
  onSubmit,
  onCancel,
  submitting,
  error,
  hasExistingOrigin,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitting: boolean;
  error: string | null;
  hasExistingOrigin: boolean;
}) {
  return (
    <View style={styles.ctaCard}>
      <Feather name="search" size={28} color={colors.accent} />
      <Text style={styles.ctaTitle}>Enter a location</Text>
      <Text style={styles.ctaBody}>
        Type a ZIP code, city, or address. We&apos;ll find Orthodox parishes
        near that point.
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        onSubmitEditing={onSubmit}
        placeholder="10001 or Boston, MA"
        placeholderTextColor={colors.inkSoft}
        style={styles.manualInput}
        autoCapitalize="words"
        autoCorrect={false}
        autoFocus
        returnKeyType="search"
        editable={!submitting}
        accessibilityLabel="Enter a ZIP code or city name"
      />
      {error ? <Text style={styles.manualError}>{error}</Text> : null}
      <Pressable
        onPress={onSubmit}
        disabled={submitting || value.trim().length === 0}
        style={({ pressed }) => [
          styles.ctaButton,
          pressed && styles.ctaButtonPressed,
          (submitting || value.trim().length === 0) && styles.ctaButtonDisabled,
        ]}
        accessibilityRole="button"
      >
        {submitting ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text style={styles.ctaButtonLabel}>Search</Text>
        )}
      </Pressable>
      <Pressable onPress={onCancel} hitSlop={6} disabled={submitting}>
        <Text style={styles.ctaSecondaryLabel}>
          {hasExistingOrigin ? "Keep current location" : "Cancel"}
        </Text>
      </Pressable>
    </View>
  );
}

function ParishList({
  origin,
  radiusMi,
  jurisdictions,
}: {
  origin: Origin;
  radiusMi: number;
  jurisdictions: string[];
}) {
  const api = getApi();
  // Cache key includes radius + jurisdictions so toggles refetch correctly.
  // Sort jurisdictions inside the key so order-invariance is preserved.
  const jurKey = [...jurisdictions].sort().join(",");
  const query = useQuery({
    queryKey: [
      "parishes-near",
      origin.lat,
      origin.lng,
      radiusMi,
      LIMIT,
      jurKey,
    ],
    queryFn: () =>
      api.fetchParishesNear({
        lat: origin.lat,
        lng: origin.lng,
        radiusMi,
        limit: LIMIT,
        jurisdictions: jurisdictions.length > 0 ? jurisdictions : undefined,
      }),
    staleTime: 5 * 60 * 1000,
  });

  if (query.isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.loadingLabel}>Looking for parishes...</Text>
      </View>
    );
  }

  if (query.error) {
    return (
      <View style={styles.errorWrap}>
        <Eyebrow tone="oxblood">Couldn&apos;t load parishes</Eyebrow>
        <Text
          style={[
            text.body,
            { color: colors.error, marginTop: spacing.sm },
          ]}
        >
          {query.error instanceof Error
            ? query.error.message
            : String(query.error)}
        </Text>
      </View>
    );
  }

  if (!query.data) return null;

  return (
    <View style={styles.section}>
      <SectionHeader
        eyebrow={`Within ${query.data.radiusMi} miles`}
        title={`${query.data.count} parish${query.data.count === 1 ? "" : "es"}`}
        rule
      />
      <View style={styles.list}>
        {query.data.parishes.map((parish) => (
          <ParishRow key={parish.id} parish={parish} />
        ))}
      </View>
      {query.data.count === 0 ? (
        <Text style={styles.emptyText}>
          No parishes within {query.data.radiusMi} miles of your location. Try
          widening the radius once the filter UI lands.
        </Text>
      ) : null}
    </View>
  );
}

// Filter controls — radius chip row + jurisdiction chip row. Both stay
// pinned above the list. Jurisdictions render in a horizontal ScrollView
// because 12 codes won't fit on a single phone-width row.
function FilterControls({
  radiusMi,
  onRadiusChange,
  selectedJurisdictions,
  onToggleJurisdiction,
  onClearJurisdictions,
}: {
  radiusMi: RadiusOption;
  onRadiusChange: (r: RadiusOption) => void;
  selectedJurisdictions: string[];
  onToggleJurisdiction: (code: string) => void;
  onClearJurisdictions: () => void;
}) {
  const anyJurisdictionSelected = selectedJurisdictions.length > 0;
  return (
    <View style={styles.filterWrap}>
      {/* Radius — single selection */}
      <View style={styles.filterGroup}>
        <Text style={styles.filterGroupLabel}>Radius</Text>
        <View style={styles.chipRow}>
          {RADIUS_OPTIONS.map((r) => {
            const active = r === radiusMi;
            return (
              <Pressable
                key={r}
                onPress={() => onRadiusChange(r)}
                style={({ pressed }) => [
                  styles.filterChip,
                  active && styles.filterChipActive,
                  pressed && !active && { opacity: 0.7 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${r} miles`}
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[
                    styles.filterChipLabel,
                    active && styles.filterChipLabelActive,
                  ]}
                >
                  {r} mi
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Jurisdictions — multi-select */}
      <View style={styles.filterGroup}>
        <View style={styles.filterGroupHeader}>
          <Text style={styles.filterGroupLabel}>Jurisdictions</Text>
          {anyJurisdictionSelected ? (
            <Pressable
              onPress={onClearJurisdictions}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Clear jurisdiction filter"
            >
              <Text style={styles.filterClearLabel}>All</Text>
            </Pressable>
          ) : null}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.jurisdictionScroll}
        >
          {ALL_JURISDICTIONS.map((j) => {
            const active = selectedJurisdictions.includes(j.code);
            return (
              <Pressable
                key={j.code}
                onPress={() => onToggleJurisdiction(j.code)}
                style={({ pressed }) => [
                  styles.filterChip,
                  active && styles.filterChipActive,
                  pressed && !active && { opacity: 0.7 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={j.short}
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[
                    styles.filterChipLabel,
                    active && styles.filterChipLabelActive,
                  ]}
                >
                  {j.short}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

function ParishRow({ parish }: { parish: NearbyParish }) {
  return (
    <Pressable
      onPress={() =>
        router.push(
          `/parishes/${parish.state.toLowerCase()}/${parish.slug}` as never,
        )
      }
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${parish.name}, ${parish.jurisdictionLabel}, ${parish.distanceMi.toFixed(1)} miles away`}
    >
      <View style={styles.rowDistance}>
        <Text style={styles.rowDistanceValue}>
          {parish.distanceMi.toFixed(1)}
        </Text>
        <Text style={styles.rowDistanceUnit}>mi</Text>
      </View>
      <View style={styles.rowMid}>
        <Text style={styles.rowName} numberOfLines={2}>
          {parish.name}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {parish.city}, {parish.state}
        </Text>
        <Text style={styles.rowJurisdiction} numberOfLines={1}>
          {parish.jurisdictionLabel}
        </Text>
      </View>
      <Feather name="chevron-right" size={16} color={colors.inkSoft} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
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
  loading: {
    paddingVertical: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
  },
  loadingLabel: {
    ...text.body,
    color: colors.inkMuted,
  },
  errorWrap: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  // Filter UI — radius chips + jurisdiction chips above the list
  filterWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  filterGroup: {
    gap: spacing.sm,
  },
  filterGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  filterGroupLabel: {
    fontFamily: fonts.sans,
    fontSize: 10.5,
    fontWeight: "600",
    color: colors.inkSoft,
    letterSpacing: 2.6,
    textTransform: "uppercase",
  },
  filterClearLabel: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  jurisdictionScroll: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: "transparent",
  },
  filterChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterChipLabel: {
    fontFamily: fonts.sans,
    fontSize: 12,
    fontWeight: "600",
    color: colors.inkMuted,
    letterSpacing: 0.4,
  },
  filterChipLabelActive: {
    color: colors.background,
  },
  list: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  // CTA card — used for permission-request, denied, and error states. Same
  // card shape with different icon/copy/button so the transitions don't
  // jump the layout.
  ctaCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
    alignItems: "center",
    gap: spacing.md,
  },
  ctaTitle: {
    ...text.titleMd,
    textAlign: "center",
  },
  ctaBody: {
    ...text.body,
    textAlign: "center",
    lineHeight: 22,
  },
  ctaButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    minWidth: 200,
    alignItems: "center",
  },
  ctaButtonPressed: {
    opacity: 0.85,
  },
  ctaButtonDisabled: {
    opacity: 0.5,
  },
  ctaButtonLabel: {
    fontFamily: fonts.sans,
    fontSize: 14,
    fontWeight: "700",
    color: colors.background,
    letterSpacing: 0.5,
  },
  // Secondary inline link below the primary CTA button — used for the
  // "Or enter a ZIP" affordance on each gate.
  ctaSecondaryLabel: {
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: "600",
    color: colors.accent,
    letterSpacing: 0.3,
    textDecorationLine: "underline",
    marginTop: spacing.xs,
  },
  // Manual-entry input
  manualInput: {
    width: "100%",
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
    backgroundColor: colors.background,
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.ink,
  },
  manualError: {
    ...text.body,
    color: colors.error,
    textAlign: "center",
  },
  // Inline link that appears above the list once the user has a location,
  // letting them swap to a different city without losing filter state.
  useDifferentLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  useDifferentLabel: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  rowPressed: {
    backgroundColor: colors.surfaceStrong,
  },
  rowDistance: {
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  rowDistanceValue: {
    fontFamily: fonts.serif,
    fontSize: 20,
    color: colors.accent,
    lineHeight: 22,
  },
  rowDistanceUnit: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.inkSoft,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 2,
  },
  rowMid: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    ...text.bodyStrong,
  },
  rowMeta: {
    ...text.body,
    fontSize: 12,
    marginTop: 2,
  },
  rowJurisdiction: {
    ...text.byline,
    fontSize: 12,
    color: colors.inkSoft,
    marginTop: 2,
  },
  emptyText: {
    ...text.body,
    paddingVertical: spacing.lg,
    textAlign: "center",
  },
});

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
import type { NearbyMonastery } from "@theosis/core";

import {
  Eyebrow,
  GiltRule,
  SectionHeader,
} from "@/components/theosis/primitives";
import { colors, fonts, radii, spacing, text } from "@/constants/theosis-theme";
import { getApi } from "@/lib/api";

// Monasteries — "find a monastery near me" surface, gated by location
// permission. Mirrors the parishes screen: same permission state machine and
// manual-ZIP fallback, plus an extra Men's/Women's community filter (the
// Assembly directory splits its listings that way). Monastic communities are
// sparse (~70 nationwide), so the default radius is wider than parishes.

const DEFAULT_RADIUS_MI = 100;
const LIMIT = 100;

const RADIUS_OPTIONS = [25, 50, 100, 250, 500] as const;
type RadiusOption = (typeof RADIUS_OPTIONS)[number];

// Jurisdiction chips — same 12 canonical codes as parishes, ordered roughly
// by how many monasteries each has so the row reads naturally.
const ALL_JURISDICTIONS: { code: string; short: string }[] = [
  { code: "goa", short: "Greek" },
  { code: "oca", short: "OCA" },
  { code: "roc", short: "ROCOR" },
  { code: "ser", short: "Serbian" },
  { code: "ant", short: "Antiochian" },
  { code: "rom", short: "Romanian" },
  { code: "bgr", short: "Bulgarian" },
  { code: "geo", short: "Georgian" },
  { code: "ukr", short: "Ukrainian" },
  { code: "cpr", short: "Carpatho" },
  { code: "mos", short: "Moscow" },
  { code: "alb", short: "Albanian" },
];

// Community-type chips — the monastic counterpart to the jurisdiction filter.
const COMMUNITY_OPTIONS: { code: string; short: string }[] = [
  { code: "male", short: "Men's" },
  { code: "female", short: "Women's" },
];

function communityShort(t: string): string {
  return t === "male" ? "Men's" : t === "female" ? "Women's" : "";
}

// Round to ~1km so small step changes don't bust the React Query cache.
function roundCoord(v: number): number {
  return Math.round(v * 100) / 100;
}

// Nominatim returns long display strings; keep just the first 2-3 segments.
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

export default function MonasteriesScreen() {
  const api = getApi();
  const [permission, requestPermission] = Location.useForegroundPermissions();
  const [state, setState] = useState<LocationState>({ kind: "idle" });

  // Manual-entry UI is hidden by default; user reveals it via the "Or
  // enter a ZIP" link beneath each gate card.
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  // Filter state — lifted here so controls and list share one source of
  // truth. Empty arrays mean "all" (no filter); we never persist empties.
  const [radiusMi, setRadiusMi] = useState<RadiusOption>(DEFAULT_RADIUS_MI);
  const [selectedJurisdictions, setSelectedJurisdictions] = useState<string[]>(
    [],
  );
  const [selectedCommunityTypes, setSelectedCommunityTypes] = useState<string[]>(
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

  const toggleCommunityType = useCallback((code: string) => {
    setSelectedCommunityTypes((current) =>
      current.includes(code)
        ? current.filter((t) => t !== code)
        : [...current, code],
    );
  }, []);

  const clearCommunityFilter = useCallback(() => {
    setSelectedCommunityTypes([]);
  }, []);

  // The fix-acquisition routine, broken out so we can call it on first grant
  // and on user retry. Uses last-known if available (instant); falls back to
  // a fresh fix (a few seconds, may prompt OS location services).
  const acquireLocation = useCallback(async () => {
    setState({ kind: "fetching" });
    try {
      const lastKnown = await Location.getLastKnownPositionAsync({
        maxAge: 5 * 60 * 1000,
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

  // React to permission status: as soon as it transitions to granted, get a
  // fix. If denied, surface the denial state. Undetermined stays idle.
  useEffect(() => {
    if (!permission) return;
    if (state.kind !== "idle" && state.kind !== "requesting" && state.kind !== "denied") {
      return;
    }
    if (permission.status === "granted") {
      acquireLocation();
    } else if (permission.status === "denied") {
      setState({ kind: "denied", canAskAgain: permission.canAskAgain });
    }
  }, [permission, acquireLocation, state.kind]);

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
          <View style={styles.header}>
            <Eyebrow tone="accent">Find a monastery</Eyebrow>
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
                selectedCommunityTypes={selectedCommunityTypes}
                onToggleCommunityType={toggleCommunityType}
                onClearCommunityTypes={clearCommunityFilter}
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
              <MonasteryList
                origin={state.origin}
                radiusMi={radiusMi}
                jurisdictions={selectedJurisdictions}
                communityTypes={selectedCommunityTypes}
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
        Theosis uses your location to find Orthodox monasteries near you. Your
        coordinates are only used to compute distances — they aren&apos;t saved
        or used to identify you.
      </Text>
      <Pressable
        onPress={onEnable}
        style={({ pressed }) => [
          styles.ctaButton,
          pressed && styles.ctaButtonPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Enable location to find monasteries near you"
      >
        <Text style={styles.ctaButtonLabel}>Find monasteries near me</Text>
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
          ? "We need access to your location to find monasteries near you."
          : `You've denied location access. To find monasteries near you, enable location for Theosis in ${Platform.OS === "ios" ? "Settings" : "your device settings"}.`}
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
        Type a ZIP code, city, or address. We&apos;ll find Orthodox monasteries
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

function MonasteryList({
  origin,
  radiusMi,
  jurisdictions,
  communityTypes,
}: {
  origin: Origin;
  radiusMi: number;
  jurisdictions: string[];
  communityTypes: string[];
}) {
  const api = getApi();
  // Cache key includes radius + both filters so toggles refetch correctly.
  // Sort inside the key so order-invariance is preserved.
  const jurKey = [...jurisdictions].sort().join(",");
  const communityKey = [...communityTypes].sort().join(",");
  const query = useQuery({
    queryKey: [
      "monasteries-near",
      origin.lat,
      origin.lng,
      radiusMi,
      LIMIT,
      jurKey,
      communityKey,
    ],
    queryFn: () =>
      api.fetchMonasteriesNear({
        lat: origin.lat,
        lng: origin.lng,
        radiusMi,
        limit: LIMIT,
        jurisdictions: jurisdictions.length > 0 ? jurisdictions : undefined,
        communityTypes: communityTypes.length > 0 ? communityTypes : undefined,
      }),
    staleTime: 5 * 60 * 1000,
  });

  if (query.isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.loadingLabel}>Looking for monasteries...</Text>
      </View>
    );
  }

  if (query.error) {
    return (
      <View style={styles.errorWrap}>
        <Eyebrow tone="oxblood">Couldn&apos;t load monasteries</Eyebrow>
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
        title={`${query.data.count} monaster${query.data.count === 1 ? "y" : "ies"}`}
        rule
      />
      <View style={styles.list}>
        {query.data.monasteries.map((monastery) => (
          <MonasteryRow key={monastery.id} monastery={monastery} />
        ))}
      </View>
      {query.data.count === 0 ? (
        <Text style={styles.emptyText}>
          No monasteries within {query.data.radiusMi} miles. Monastic
          communities are sparse — try widening the radius or clearing filters.
        </Text>
      ) : null}
    </View>
  );
}

// Filter controls — radius + jurisdiction + community chip rows, pinned above
// the list. Jurisdictions scroll horizontally (12 codes won't fit one row).
function FilterControls({
  radiusMi,
  onRadiusChange,
  selectedJurisdictions,
  onToggleJurisdiction,
  onClearJurisdictions,
  selectedCommunityTypes,
  onToggleCommunityType,
  onClearCommunityTypes,
}: {
  radiusMi: RadiusOption;
  onRadiusChange: (r: RadiusOption) => void;
  selectedJurisdictions: string[];
  onToggleJurisdiction: (code: string) => void;
  onClearJurisdictions: () => void;
  selectedCommunityTypes: string[];
  onToggleCommunityType: (code: string) => void;
  onClearCommunityTypes: () => void;
}) {
  const anyJurisdictionSelected = selectedJurisdictions.length > 0;
  const anyCommunitySelected = selectedCommunityTypes.length > 0;
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

      {/* Community — Men's / Women's, multi-select */}
      <View style={styles.filterGroup}>
        <View style={styles.filterGroupHeader}>
          <Text style={styles.filterGroupLabel}>Community</Text>
          {anyCommunitySelected ? (
            <Pressable
              onPress={onClearCommunityTypes}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Clear community filter"
            >
              <Text style={styles.filterClearLabel}>All</Text>
            </Pressable>
          ) : null}
        </View>
        <View style={styles.chipRow}>
          {COMMUNITY_OPTIONS.map((c) => {
            const active = selectedCommunityTypes.includes(c.code);
            return (
              <Pressable
                key={c.code}
                onPress={() => onToggleCommunityType(c.code)}
                style={({ pressed }) => [
                  styles.filterChip,
                  active && styles.filterChipActive,
                  pressed && !active && { opacity: 0.7 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${c.short} monasteries`}
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[
                    styles.filterChipLabel,
                    active && styles.filterChipLabelActive,
                  ]}
                >
                  {c.short}
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

function MonasteryRow({ monastery }: { monastery: NearbyMonastery }) {
  const community = communityShort(monastery.communityType);
  return (
    <Pressable
      onPress={() =>
        router.push(
          `/monasteries/${monastery.state.toLowerCase()}/${monastery.slug}` as never,
        )
      }
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${monastery.name}, ${monastery.jurisdictionLabel}, ${monastery.distanceMi.toFixed(1)} miles away`}
    >
      <View style={styles.rowDistance}>
        <Text style={styles.rowDistanceValue}>
          {monastery.distanceMi.toFixed(1)}
        </Text>
        <Text style={styles.rowDistanceUnit}>mi</Text>
      </View>
      <View style={styles.rowMid}>
        <Text style={styles.rowName} numberOfLines={2}>
          {monastery.name}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {monastery.city}, {monastery.state}
          {community ? ` · ${community}` : ""}
        </Text>
        <Text style={styles.rowJurisdiction} numberOfLines={1}>
          {monastery.jurisdictionLabel}
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
  ctaSecondaryLabel: {
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: "600",
    color: colors.accent,
    letterSpacing: 0.3,
    textDecorationLine: "underline",
    marginTop: spacing.xs,
  },
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

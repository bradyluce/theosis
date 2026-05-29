// Settings — the You tab's deep page. Composed like a library-person
// profile: gilt-edged masthead with Wordmark + page eyebrow, sections
// rendered through <Card> with <SectionHeader> giving each block its
// eyebrow/title/rule. Every preference + identity field uses the same
// vocabulary the rest of the app uses — choice radio cards, tappable
// picker rows, gilt buttons — so this screen feels of-a-piece with
// people/[slug], works/[slug], and the Daily home.

import { SignedIn, SignedOut, useAuth, useClerk, useUser } from "@clerk/clerk-expo";
import Feather from "@expo/vector-icons/Feather";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  CALENDAR_OPTIONS,
  FASTING_OPTIONS,
  JURISDICTION_OPTIONS,
  TRANSLATION_OPTIONS,
} from "@theosis/core/onboarding";

import {
  Card,
  Eyebrow,
  GiltRule,
  Halo,
  SectionHeader,
  Wordmark,
} from "@/components/theosis/primitives";
import { colors, fonts, radii, spacing } from "@/constants/theosis-theme";
import { getApi, getApiBaseUrl } from "@/lib/api";
import {
  type ProfilePrefs,
  getProfilePrefs,
  updateProfilePrefs,
} from "@/lib/preferences";
import { clearLocalUserData, signOutWithFlush } from "@/lib/sync/sign-out";
import { usePatronIcon } from "@/lib/use-patron-icon";

// ---------------------------------------------------------------------------
// Option lists used only here. The other option arrays come from
// @theosis/core/onboarding so settings and onboarding stay verbatim-equal.
// ---------------------------------------------------------------------------

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

// The legacy 3-radio ranking was retired in favor of a per-Father
// picker at /commentary-fathers. Settings now exposes that picker as
// a tile row in the Practice section instead.

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function SettingsScreen() {
  const [prefs, setPrefs] = useState<ProfilePrefs>({});

  // Re-read prefs on focus so values updated by sub-pickers (saint-picker,
  // parish locator) are reflected when we return.
  useFocusEffect(
    useCallback(() => {
      let canceled = false;
      void getProfilePrefs().then((p) => {
        if (!canceled) setPrefs(p);
      });
      return () => {
        canceled = true;
      };
    }, []),
  );

  function update(patch: Partial<ProfilePrefs>) {
    setPrefs((prev) => ({ ...prev, ...patch }));
    void updateProfilePrefs(patch);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={[
          "rgba(212, 168, 87, 0.12)",
          "rgba(139, 58, 58, 0.03)",
          colors.background,
        ]}
        locations={[0, 0.42, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Masthead — Wordmark + back chevron */}
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
        <Wordmark size={16} subline="Settings" />
        <View style={styles.mastheadSpacer} />
      </View>
      <GiltRule full style={{ marginHorizontal: spacing.xl }} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Identity hero */}
        <IdentityHero patronSlug={prefs.patronSaintSlug} />

        {/* Identity: Status, Jurisdiction, Parish */}
        <Card>
          <SectionHeader eyebrow="Identity" title="Who you are" rule />
          <View style={{ gap: spacing.md, marginTop: spacing.md }}>
            <FieldGroup label="Status">
              {STATUS_OPTIONS.map((opt) => (
                <ChoiceTile
                  key={opt.value}
                  label={opt.label}
                  description={opt.description}
                  selected={prefs.status === opt.value}
                  onPress={() => update({ status: opt.value })}
                />
              ))}
            </FieldGroup>

            <JurisdictionField
              value={prefs.jurisdiction}
              onChange={(v) => update({ jurisdiction: v })}
            />

            <ParishField parish={prefs.parish} />
          </View>
        </Card>

        {/* Reader: Calendar + Translation */}
        <Card>
          <SectionHeader eyebrow="Reader" title="Scripture & calendar" rule />
          <View style={{ gap: spacing.md, marginTop: spacing.md }}>
            <FieldGroup label="Calendar">
              {CALENDAR_OPTIONS.map((opt) => {
                const expected =
                  opt.value === "old-calendar" ? "julian" : "new";
                const selected = (prefs.calendarSystem ?? "new") === expected;
                return (
                  <ChoiceTile
                    key={opt.value}
                    label={opt.label}
                    description={opt.description}
                    selected={selected}
                    onPress={() => update({ calendarSystem: expected })}
                  />
                );
              })}
            </FieldGroup>

            <FieldGroup label="Primary translation">
              {TRANSLATION_OPTIONS.map((opt) => {
                const selected =
                  (prefs.primaryTranslationId ?? "kjva") === opt.value;
                return (
                  <ChoiceTile
                    key={opt.value}
                    label={opt.label}
                    description={opt.description}
                    selected={selected}
                    onPress={() =>
                      update({ primaryTranslationId: opt.value })
                    }
                  />
                );
              })}
            </FieldGroup>

            <FieldGroup label="Text size">
              {(
                [
                  { value: "sm", label: "Small", description: "Tighter prose, more on screen." },
                  { value: "md", label: "Medium", description: "Default — comfortable for most." },
                  { value: "lg", label: "Large", description: "Roomier for longer reading." },
                  { value: "xl", label: "Extra large", description: "Generous — easy on the eyes." },
                ] as const
              ).map((opt) => {
                const selected = (prefs.textSize ?? "md") === opt.value;
                return (
                  <ChoiceTile
                    key={opt.value}
                    label={opt.label}
                    description={opt.description}
                    selected={selected}
                    onPress={() => update({ textSize: opt.value })}
                  />
                );
              })}
            </FieldGroup>
          </View>
        </Card>

        {/* Practice: Fasting + Patron + Commentary ranking + Prayer rule */}
        <Card>
          <SectionHeader eyebrow="Practice" title="Daily rhythm" rule />
          <View style={{ gap: spacing.md, marginTop: spacing.md }}>
            <FieldGroup label="Fasting level">
              {FASTING_OPTIONS.map((opt) => {
                const selected =
                  (prefs.fastingLevel ?? "standard") === opt.value;
                return (
                  <ChoiceTile
                    key={opt.value}
                    label={opt.label}
                    description={opt.description}
                    selected={selected}
                    onPress={() => update({ fastingLevel: opt.value })}
                  />
                );
              })}
            </FieldGroup>

            <PatronField patronSlug={prefs.patronSaintSlug} />

            <FieldGroup label="Commentary fathers">
              <Pressable
                onPress={() => router.push("/commentary-fathers")}
                style={({ pressed }) => [
                  styles.tile,
                  pressed && { backgroundColor: colors.surfaceStrong },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Customize commentary fathers"
              >
                <View style={styles.tileMain}>
                  <Text style={styles.tileLabel}>
                    Customize who you hear from
                  </Text>
                  <Text style={styles.tileDescription} numberOfLines={2}>
                    Pick which Fathers&apos; commentary appears on each verse,
                    in what order. Quick filters by era or region.
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.inkSoft} />
              </Pressable>
            </FieldGroup>

            <Pressable
              onPress={() => router.push("/prayer-builder")}
              style={({ pressed }) => [
                styles.linkRow,
                pressed && { backgroundColor: colors.surfaceStrong },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Build your prayer rule"
            >
              <View style={styles.linkRowMain}>
                <Text style={styles.linkRowLabel}>Prayer rule</Text>
                <Text style={styles.linkRowDescription}>
                  Browse the prayer corpus, build your morning + evening
                  rule, save as PDF to print.
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.inkSoft} />
            </Pressable>

            <Pressable
              onPress={() => router.push("/diptych")}
              style={({ pressed }) => [
                styles.linkRow,
                pressed && { backgroundColor: colors.surfaceStrong },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Open diptych"
            >
              <View style={styles.linkRowMain}>
                <Text style={styles.linkRowLabel}>Diptych</Text>
                <Text style={styles.linkRowDescription}>
                  Names you hold up in prayer — living and departed.
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.inkSoft} />
            </Pressable>
          </View>
        </Card>

        {/* Account: sign-in card + restart setup */}
        <Card>
          <SectionHeader eyebrow="Account" title="Your session" rule />
          <View style={{ gap: spacing.md, marginTop: spacing.md }}>
            <AccountCard />
          </View>
        </Card>

        {/* About — legal pages required for the App Store and useful
            for any user who wants to know what we collect. */}
        <Card>
          <SectionHeader eyebrow="About" title="Help & legal" rule />
          <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
            <Pressable
              onPress={() =>
                Linking.openURL(
                  "mailto:contact.theosis@gmail.com?subject=Theosis%20feedback",
                )
              }
              style={({ pressed }) => [
                styles.linkRow,
                pressed && { backgroundColor: colors.surfaceStrong },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Contact us"
            >
              <View style={styles.linkRowMain}>
                <Text style={styles.linkRowLabel}>Contact us</Text>
                <Text style={styles.linkRowDescription}>
                  Questions, feature ideas, or something not working? We&apos;d
                  love to hear from you.
                </Text>
              </View>
              <Feather name="mail" size={15} color={colors.inkSoft} />
            </Pressable>
            <Pressable
              onPress={() => router.push("/terms")}
              style={({ pressed }) => [
                styles.linkRow,
                pressed && { backgroundColor: colors.surfaceStrong },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Terms of Service"
            >
              <View style={styles.linkRowMain}>
                <Text style={styles.linkRowLabel}>Terms of Service</Text>
                <Text style={styles.linkRowDescription}>
                  What Theosis is and what it isn&apos;t.
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.inkSoft} />
            </Pressable>
            <Pressable
              onPress={() => router.push("/privacy")}
              style={({ pressed }) => [
                styles.linkRow,
                pressed && { backgroundColor: colors.surfaceStrong },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Privacy Policy"
            >
              <View style={styles.linkRowMain}>
                <Text style={styles.linkRowLabel}>Privacy Policy</Text>
                <Text style={styles.linkRowDescription}>
                  What we collect, where it lives, what we don&apos;t do
                  with it.
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.inkSoft} />
            </Pressable>
          </View>
        </Card>

        <Text style={styles.footer}>Made with reverence.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Identity hero — Halo'd avatar + Clerk display name
// ---------------------------------------------------------------------------

function IdentityHero({ patronSlug }: { patronSlug: string | undefined }) {
  const { user, isSignedIn } = useUser();
  const patronIcon = usePatronIcon(patronSlug);
  const displayName = isSignedIn
    ? user?.firstName ??
      user?.fullName ??
      user?.primaryEmailAddress?.emailAddress?.split("@")[0] ??
      "Friend"
    : "Friend";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <View style={styles.hero}>
      <Halo size={84} glow>
        {patronIcon ? (
          <Image
            source={{ uri: patronIcon.src }}
            accessibilityLabel={patronIcon.alt}
            style={styles.heroAvatarImage}
            contentFit="cover"
            transition={140}
          />
        ) : (
          <Text style={styles.heroInitial}>{initial}</Text>
        )}
      </Halo>
      <View style={styles.heroText}>
        <Eyebrow tone="accent">
          {isSignedIn ? "Signed in" : "Browsing as guest"}
        </Eyebrow>
        <Text style={styles.heroName}>{displayName}</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Account card inside the Account section
// ---------------------------------------------------------------------------

function AccountCard() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { getToken } = useAuth();
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSignOut() {
    if (busy) return;
    setBusy(true);
    try {
      // Flush in-flight writes (profile + queue) to the server BEFORE
      // wiping local data — otherwise unsynced notes/highlights/patron
      // are lost (clearLocalUserData drops the queue, and profile patches
      // are fire-and-forget). If anything is still pending after the
      // flush, warn before discarding. signOutWithFlush also ensures the
      // local clear lands before Clerk's signOut() (the auth bridge in
      // _layout.tsx re-fires on signOut, so order matters).
      await signOutWithFlush({
        signOut,
        confirmDiscard: (count) =>
          new Promise<boolean>((resolve) => {
            Alert.alert(
              "Unsynced changes",
              `${count} change${count === 1 ? "" : "s"} haven't finished syncing. If you sign out now they'll be lost. Sign out anyway?`,
              [
                {
                  text: "Cancel",
                  style: "cancel",
                  onPress: () => resolve(false),
                },
                {
                  text: "Sign out anyway",
                  style: "destructive",
                  onPress: () => resolve(true),
                },
              ],
            );
          }),
      });
    } finally {
      setBusy(false);
    }
  }

  // Account deletion: confirm twice, hit DELETE /api/me which drops
  // the Postgres row + cascades to every related table, then signOut
  // on the Clerk side. The deletion is irreversible by design (App
  // Store guideline 4.1).
  function handleDelete() {
    if (deleting) return;
    Alert.alert(
      "Delete your account?",
      "Your highlights, notes, reading list, prayer rule, diptych, and all other data will be permanently deleted from our servers. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Really delete?",
              "Last chance. Tap Delete to permanently remove your account and all data.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: performDelete,
                },
              ],
            );
          },
        },
      ],
    );
  }

  async function performDelete() {
    setDeleting(true);
    try {
      const token = await getToken();
      if (!token) {
        Alert.alert("Sign in expired", "Please sign in again, then retry.");
        return;
      }
      const res = await fetch(`${getApiBaseUrl()}/api/me`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        Alert.alert(
          "Deletion failed",
          `Server returned ${res.status}. Try again, or contact support.`,
        );
        return;
      }
      // Server data is gone — now wipe local data too. Account deletion
      // is "I'm done with Theosis" semantics, not "switch users," so
      // the prefs blob, pending writes, and anonymous-id all go with
      // the server row. Then sign Clerk out.
      await clearLocalUserData();
      await signOut();
    } catch (err) {
      Alert.alert(
        "Network error",
        err instanceof Error ? err.message : String(err),
      );
    } finally {
      setDeleting(false);
    }
  }

  const email = user?.primaryEmailAddress?.emailAddress ?? null;

  return (
    <>
      <SignedOut>
        <Pressable
          onPress={() => router.push("/auth")}
          style={({ pressed }) => [
            styles.linkRow,
            pressed && { backgroundColor: colors.surfaceStrong },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Sign in"
        >
          <View style={styles.linkRowMain}>
            <Text style={styles.linkRowLabel}>Sign in to Theosis</Text>
            <Text style={styles.linkRowDescription}>
              Sync your highlights, notes, and reading list across devices.
            </Text>
          </View>
          <Feather name="chevron-right" size={16} color={colors.inkSoft} />
        </Pressable>
      </SignedOut>

      <SignedIn>
        <View style={styles.accountIdentity}>
          <Eyebrow tone="soft">Email</Eyebrow>
          <Text style={styles.accountEmail} numberOfLines={1}>
            {email ?? "—"}
          </Text>
          <View style={styles.accountActions}>
            <Pressable
              onPress={() => router.push("/auth")}
              style={({ pressed }) => [
                styles.pillButton,
                pressed && { opacity: 0.7 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Manage account"
            >
              <Text style={styles.pillButtonLabel}>Manage</Text>
            </Pressable>
            <Pressable
              onPress={handleSignOut}
              disabled={busy}
              style={({ pressed }) => [
                styles.pillButton,
                styles.pillButtonDanger,
                pressed && { opacity: 0.7 },
                busy && { opacity: 0.4 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Sign out"
            >
              <Text style={styles.pillButtonDangerLabel}>
                {busy ? "Signing out…" : "Sign out"}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Account deletion — App Store guideline 4.1 requires in-app
            account deletion when an account can be created in-app. */}
        <Pressable
          onPress={handleDelete}
          disabled={deleting}
          style={({ pressed }) => [
            styles.linkRow,
            styles.linkRowDanger,
            deleting && { opacity: 0.5 },
            pressed && { opacity: 0.7 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Delete my account"
        >
          <View style={styles.linkRowMain}>
            <Text style={[styles.linkRowLabel, styles.linkRowLabelDanger]}>
              {deleting ? "Deleting…" : "Delete my account"}
            </Text>
            <Text style={styles.linkRowDescription}>
              Permanently removes your account and every record we hold —
              highlights, notes, reading list, prayer rule, diptych. Cannot
              be undone.
            </Text>
          </View>
          <Feather name="trash-2" size={15} color={colors.oxbloodInk} />
        </Pressable>
      </SignedIn>
    </>
  );
}

// ---------------------------------------------------------------------------
// Patron saint field — tap-to-pick row showing the current saint
// ---------------------------------------------------------------------------

function PatronField({ patronSlug }: { patronSlug: string | undefined }) {
  const api = getApi();
  const peopleQuery = useQuery({
    queryKey: ["library-people"],
    queryFn: () => api.fetchLibraryPeople(),
    staleTime: 60 * 60 * 1000,
    enabled: !!patronSlug,
  });

  const current = patronSlug
    ? peopleQuery.data?.people.find((p) => p.slug === patronSlug)
    : null;

  return (
    <FieldGroup label="Patron saint">
      <Pressable
        onPress={() => router.push("/saint-picker")}
        style={({ pressed }) => [
          styles.tile,
          pressed && { backgroundColor: colors.surfaceStrong },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Choose patron saint"
      >
        <View style={styles.patronAvatar}>
          {current?.icon ? (
            <Image
              source={{ uri: current.icon.src }}
              style={styles.patronAvatarImage}
              contentFit="cover"
              transition={140}
            />
          ) : (
            <Text style={styles.patronAvatarLetter}>
              {current?.name?.charAt(0) ?? "?"}
            </Text>
          )}
        </View>
        <View style={styles.tileMain}>
          {current ? (
            <>
              <Text style={styles.tileLabel} numberOfLines={1}>
                {current.honorific
                  ? `${current.honorific} ${current.name.split(",")[0]}`
                  : current.name.split(",")[0]}
              </Text>
              <Text style={styles.tileDescription} numberOfLines={1}>
                {[current.eraLabel, current.feastDayLabel]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.tileLabel}>Choose your patron saint</Text>
              <Text style={styles.tileDescription}>
                Highlighted on Daily; ranks first in commentary.
              </Text>
            </>
          )}
        </View>
        <Feather name="chevron-right" size={16} color={colors.inkSoft} />
      </Pressable>
    </FieldGroup>
  );
}

// ---------------------------------------------------------------------------
// Jurisdiction field — tap-to-expand inline picker (13 options is too many
// for inline radios)
// ---------------------------------------------------------------------------

function JurisdictionField({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (v: NonNullable<ProfilePrefs["jurisdiction"]>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const current = JURISDICTION_OPTIONS.find((j) => j.code === value);

  return (
    <FieldGroup label="Jurisdiction">
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={({ pressed }) => [
          styles.tile,
          pressed && { backgroundColor: colors.surfaceStrong },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Choose jurisdiction"
      >
        <View style={styles.tileMain}>
          <Text style={styles.tileLabel}>
            {current ? current.label : "Choose your jurisdiction"}
          </Text>
          <Text style={styles.tileDescription} numberOfLines={2}>
            {current?.description ||
              "Pre-selects your calendar and parish search."}
          </Text>
        </View>
        <Feather
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.inkSoft}
        />
      </Pressable>
      {expanded ? (
        <View style={styles.expandedList}>
          {JURISDICTION_OPTIONS.map((opt) => (
            <ChoiceTile
              key={opt.code}
              label={opt.label}
              description={opt.description}
              selected={value === opt.code}
              onPress={() => {
                onChange(opt.code);
                setExpanded(false);
              }}
            />
          ))}
        </View>
      ) : null}
    </FieldGroup>
  );
}

// ---------------------------------------------------------------------------
// Parish field — tappable row that routes to the existing parish locator
// ---------------------------------------------------------------------------

function ParishField({ parish }: { parish: string | undefined }) {
  return (
    <FieldGroup label="Parish">
      <Pressable
        onPress={() => router.push("/parishes")}
        style={({ pressed }) => [
          styles.tile,
          pressed && { backgroundColor: colors.surfaceStrong },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Find your parish"
      >
        <View style={styles.tileMain}>
          <Text style={styles.tileLabel}>{parish || "Find your parish"}</Text>
          <Text style={styles.tileDescription}>
            {parish
              ? "Tap to change."
              : "Search nearby Orthodox churches and pick yours."}
          </Text>
        </View>
        <Feather name="chevron-right" size={16} color={colors.inkSoft} />
      </Pressable>
    </FieldGroup>
  );
}

// ---------------------------------------------------------------------------
// Small reusable bits: field group label + radio choice tile
// ---------------------------------------------------------------------------

function FieldGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={{ gap: spacing.sm }}>{children}</View>
    </View>
  );
}

function ChoiceTile({
  label,
  description,
  selected,
  onPress,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        selected && styles.choiceSelected,
        pressed && !selected && { opacity: 0.7 },
      ]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <View style={styles.choiceText}>
        <Text
          style={[styles.choiceLabel, selected && styles.choiceLabelSelected]}
        >
          {label}
        </Text>
        {description ? (
          <Text style={styles.choiceDesc}>{description}</Text>
        ) : null}
      </View>
      {selected ? (
        <View style={styles.checkBadge}>
          <Feather name="check" size={13} color={colors.background} />
        </View>
      ) : (
        <View style={styles.checkBadgeEmpty} />
      )}
    </Pressable>
  );
}

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
  mastheadSpacer: { width: 28 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing["4xl"],
    gap: spacing.xl,
  },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  heroInitial: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 38,
    color: colors.accent,
  },
  heroAvatarImage: { width: "100%", height: "100%" },
  heroText: { flex: 1, gap: 4 },
  heroName: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 30,
    color: colors.ink,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  fieldLabel: {
    fontSize: 10.4,
    color: colors.inkSoft,
    letterSpacing: 2.4,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  choice: {
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
  choiceSelected: {
    borderColor: "rgba(212, 168, 87, 0.55)",
    backgroundColor: colors.accentSoft,
  },
  choiceText: { flex: 1, gap: 4 },
  choiceLabel: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.ink,
    letterSpacing: -0.1,
  },
  choiceLabelSelected: { color: colors.accent, fontWeight: "600" },
  choiceDesc: {
    fontSize: 12,
    color: colors.inkMuted,
    lineHeight: 18,
  },
  checkBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  checkBadgeEmpty: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  tile: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  tileMain: { flex: 1, gap: 2 },
  tileLabel: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.ink,
    letterSpacing: -0.1,
  },
  tileDescription: {
    fontSize: 12,
    color: colors.inkMuted,
    lineHeight: 17,
  },
  expandedList: { gap: spacing.sm, marginTop: spacing.sm },
  patronAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  patronAvatarImage: { width: "100%", height: "100%" },
  patronAvatarLetter: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 18,
    color: colors.accent,
  },
  linkRow: {
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
  linkRowDanger: {
    borderColor: "rgba(139, 58, 58, 0.3)",
    backgroundColor: "rgba(139, 58, 58, 0.04)",
  },
  linkRowLabelDanger: {
    color: colors.oxbloodInk,
  },
  linkRowMain: { flex: 1, gap: 2 },
  linkRowLabel: {
    fontFamily: fonts.serif,
    fontSize: 15,
    color: colors.ink,
    letterSpacing: -0.1,
  },
  linkRowDescription: {
    fontSize: 12,
    color: colors.inkMuted,
    lineHeight: 17,
  },
  accountIdentity: {
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
    backgroundColor: colors.background,
  },
  accountEmail: {
    fontFamily: fonts.mono,
    fontSize: 13,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  accountActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  pillButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  pillButtonLabel: {
    fontFamily: fonts.serif,
    fontSize: 13,
    color: colors.ink,
  },
  pillButtonDanger: {
    borderColor: "rgba(139, 58, 58, 0.4)",
    backgroundColor: "rgba(139, 58, 58, 0.05)",
  },
  pillButtonDangerLabel: {
    fontFamily: fonts.serif,
    fontSize: 13,
    color: colors.oxbloodInk,
  },
  footer: {
    fontSize: 11,
    color: colors.inkSoft,
    textAlign: "center",
    paddingTop: spacing.xl,
    fontStyle: "italic",
  },
});

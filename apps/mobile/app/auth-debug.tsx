// Sign-in screen. Reached from the onboarding "Sign in / Sign up" step
// and from the You tab / Settings Account card. Hosts:
//   - Apple + Google OAuth (via Clerk's useSSO — opens Safari View /
//     Chrome Custom Tab and returns a session)
//   - Email + password sign-in and sign-up (the latter walks through a
//     6-digit email verification code)
//   - When already signed in: a Halo'd identity card with sign-out and
//     a one-tap "Fetch /api/me" diagnostic.
//
// The screen leans on the same theosis-theme primitives that the rest
// of the app uses (Halo, Wordmark, GiltRule, Card, Eyebrow) so it feels
// like a Theosis surface, not a generic auth modal.

import {
  useAuth,
  useSignIn,
  useSignUp,
  useSSO,
  useUser,
} from "@clerk/clerk-expo";
import Feather from "@expo/vector-icons/Feather";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
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
  Card,
  Eyebrow,
  GiltRule,
  Halo,
  Wordmark,
} from "@/components/theosis/primitives";
import { colors, fonts, radii, spacing } from "@/constants/theosis-theme";
import { getApiBaseUrl } from "@/lib/api";

export default function AuthDebugScreen() {
  const { isLoaded: userLoaded, isSignedIn } = useUser();

  // The instant Clerk reports a session, leave this screen for the
  // Daily tab. Previously we landed the signed-in user on the
  // diagnostic page — "/api/me" output is great for debugging but
  // confusing for actual users.
  useEffect(() => {
    if (userLoaded && isSignedIn) {
      router.replace("/(tabs)");
    }
  }, [userLoaded, isSignedIn]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={[
          "rgba(212, 168, 87, 0.14)",
          "rgba(139, 58, 58, 0.04)",
          colors.background,
        ]}
        locations={[0, 0.45, 1]}
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
        <Wordmark size={18} subline="Sign in" />
        <View style={styles.mastheadSpacer} />
      </View>
      <GiltRule full style={{ marginHorizontal: spacing.xl }} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {!userLoaded || isSignedIn ? (
            // userLoaded:false → waiting for Clerk to hydrate
            // isSignedIn:true  → the redirect-effect is about to fire
            // In either case we render a quiet loading placeholder so
            // the user doesn't see the form for a frame.
            <View style={styles.loadingBlock}>
              <Text style={styles.loadingLabel}>
                {isSignedIn ? "Welcome — opening Theosis…" : "Loading…"}
              </Text>
            </View>
          ) : (
            <SignedOutView />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Signed-out: hero + OAuth buttons + email form
// ---------------------------------------------------------------------------

function SignedOutView() {
  const [mode, setMode] = useState<"sign-in" | "sign-up" | "email-code">(
    "sign-in",
  );

  // Warm up the in-app browser so the first OAuth tap doesn't pay the
  // Safari View Controller cold-start.
  useEffect(() => {
    void WebBrowser.warmUpAsync().catch(() => {});
    return () => {
      void WebBrowser.coolDownAsync().catch(() => {});
    };
  }, []);

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={styles.heroBlock}>
        <Eyebrow tone="accent">A library of one</Eyebrow>
        <Text style={styles.heroTitle}>Welcome home</Text>
        <Text style={styles.heroSubtitle}>
          Your highlights, notes, reading list, prayer rule, and diptych
          travel with you. Sign in once — read on any device.
        </Text>
      </View>

      {/* Benefits row — three small reasons-to-sign-in chips above the
          OAuth buttons. Quiet, not salesy; just the value props. */}
      <View style={styles.benefitsRow}>
        <BenefitChip glyph="bookmark" label="Synced highlights" />
        <BenefitChip glyph="edit-3" label="Your notes" />
        <BenefitChip glyph="feather" label="Prayer rule" />
      </View>

      <Card>
        <View style={{ gap: spacing.md }}>
          <OAuthButtons />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>OR WITH EMAIL</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.modeRow}>
            <Pressable
              onPress={() => setMode("sign-in")}
              style={[
                styles.modeButton,
                mode === "sign-in" && styles.modeButtonActive,
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === "sign-in" }}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  mode === "sign-in" && styles.modeButtonTextActive,
                ]}
              >
                Sign in
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setMode("sign-up")}
              style={[
                styles.modeButton,
                mode === "sign-up" && styles.modeButtonActive,
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === "sign-up" }}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  mode === "sign-up" && styles.modeButtonTextActive,
                ]}
              >
                Create account
              </Text>
            </Pressable>
          </View>

          {mode === "sign-in" ? (
            <SignInForm onSwitchToCode={() => setMode("email-code")} />
          ) : mode === "sign-up" ? (
            <SignUpForm />
          ) : (
            <EmailCodeSignInForm
              onBack={() => setMode("sign-in")}
            />
          )}
        </View>
      </Card>
    </View>
  );
}

function OAuthButtons() {
  const { startSSOFlow } = useSSO();
  const [busyProvider, setBusyProvider] = useState<
    "apple" | "google" | null
  >(null);

  async function handle(
    provider: "apple" | "google",
    strategy: "oauth_apple" | "oauth_google",
  ) {
    if (busyProvider) return;
    setBusyProvider(provider);
    try {
      const result = await startSSOFlow({
        strategy,
        redirectUrl: "mobile://oauth-native-callback",
      });
      if (result.createdSessionId && result.setActive) {
        await result.setActive({ session: result.createdSessionId });
      } else if (
        result.authSessionResult &&
        result.authSessionResult.type === "dismiss"
      ) {
        // User backed out; silent.
      } else {
        Alert.alert(
          "Sign-in incomplete",
          "The OAuth flow returned without a session. Try again, or use email.",
        );
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "errors" in err
          ? JSON.stringify((err as { errors: unknown }).errors)
          : String(err);
      Alert.alert(
        `${provider === "apple" ? "Apple" : "Google"} sign-in failed`,
        message,
      );
    } finally {
      setBusyProvider(null);
    }
  }

  return (
    <View style={{ gap: spacing.sm }}>
      {Platform.OS === "ios" ? (
        <Pressable
          onPress={() => handle("apple", "oauth_apple")}
          disabled={busyProvider !== null}
          style={({ pressed }) => [
            styles.oauthButton,
            styles.oauthButtonApple,
            busyProvider !== null && styles.buttonDisabled,
            pressed && styles.buttonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Continue with Apple"
        >
          <Feather
            name="moon"
            size={16}
            color="#ffffff"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.oauthButtonAppleLabel}>
            {busyProvider === "apple" ? "Opening…" : "Continue with Apple"}
          </Text>
        </Pressable>
      ) : null}
      <Pressable
        onPress={() => handle("google", "oauth_google")}
        disabled={busyProvider !== null}
        style={({ pressed }) => [
          styles.oauthButton,
          styles.oauthButtonGoogle,
          busyProvider !== null && styles.buttonDisabled,
          pressed && styles.buttonPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
      >
        <Feather
          name="globe"
          size={16}
          color={colors.ink}
          style={{ marginRight: 8 }}
        />
        <Text style={styles.oauthButtonGoogleLabel}>
          {busyProvider === "google" ? "Opening…" : "Continue with Google"}
        </Text>
      </Pressable>
    </View>
  );
}

function SignInForm({ onSwitchToCode }: { onSwitchToCode: () => void }) {
  const { isLoaded, signIn, setActive } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    if (!isLoaded || !signIn || !setActive) return;
    setBusy(true);
    try {
      const result = await signIn.create({ identifier: email, password });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
      } else {
        Alert.alert("Sign-in incomplete", `Status: ${result.status}`);
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "errors" in err
          ? JSON.stringify((err as { errors: unknown }).errors)
          : String(err);
      Alert.alert("Sign-in failed", message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <FieldLabel label="Email" />
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        placeholderTextColor={colors.inkSoft}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        style={styles.input}
      />
      <FieldLabel label="Password" />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        placeholderTextColor={colors.inkSoft}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="password"
        style={styles.input}
      />
      <Pressable
        onPress={handleSubmit}
        disabled={busy || !email || !password}
        style={({ pressed }) => [
          styles.primaryButton,
          (busy || !email || !password) && styles.buttonDisabled,
          pressed && styles.buttonPressed,
        ]}
      >
        <Text style={styles.primaryButtonText}>
          {busy ? "Signing in…" : "Sign in"}
        </Text>
      </Pressable>

      {/* Fallback to passwordless email-code sign-in. Useful if the
          user forgot their password — Clerk emails a 6-digit code
          they can punch in instead. */}
      <Pressable
        onPress={onSwitchToCode}
        hitSlop={8}
        style={({ pressed }) => [
          styles.codeFallback,
          pressed && { opacity: 0.6 },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Sign in with a code emailed to me"
      >
        <Text style={styles.codeFallbackLabel}>
          Sign in with a code instead →
        </Text>
      </Pressable>
    </View>
  );
}

// Passwordless sign-in. Clerk's `email_code` first-factor sends a
// 6-digit code to the user's email; they paste it back and we attempt
// the first factor. Functionally equivalent to a magic link without the
// brittle deep-link redirect plumbing.
function EmailCodeSignInForm({ onBack }: { onBack: () => void }) {
  const { isLoaded, signIn, setActive } = useSignIn();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);

  async function handleRequestCode() {
    if (!isLoaded || !signIn) return;
    setBusy(true);
    try {
      const attempt = await signIn.create({ identifier: email });
      // The available factors depend on how the Clerk instance is
      // configured. We look up the "email_code" factor and surface its
      // emailAddressId to prepareFirstFactor.
      const factor = attempt.supportedFirstFactors?.find(
        (f) => f.strategy === "email_code",
      );
      if (!factor || !("emailAddressId" in factor) || !factor.emailAddressId) {
        Alert.alert(
          "No code option available",
          "This account doesn't have a verified email Clerk can use for a code. Try password sign-in.",
        );
        return;
      }
      await signIn.prepareFirstFactor({
        strategy: "email_code",
        emailAddressId: factor.emailAddressId,
      });
      setStage("code");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "errors" in err
          ? JSON.stringify((err as { errors: unknown }).errors)
          : String(err);
      Alert.alert("Couldn't send code", message);
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify() {
    if (!isLoaded || !signIn || !setActive) return;
    setBusy(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code,
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
      } else {
        Alert.alert("Verification incomplete", `Status: ${result.status}`);
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "errors" in err
          ? JSON.stringify((err as { errors: unknown }).errors)
          : String(err);
      Alert.alert("Code didn't verify", message);
    } finally {
      setBusy(false);
    }
  }

  if (stage === "code") {
    return (
      <View style={{ gap: spacing.sm }}>
        <Text style={styles.helpText}>
          We emailed a 6-digit code to{" "}
          <Text style={{ fontWeight: "600" }}>{email}</Text>. Paste it below.
        </Text>
        <FieldLabel label="Code" />
        <TextInput
          value={code}
          onChangeText={setCode}
          placeholder="123456"
          placeholderTextColor={colors.inkSoft}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          style={styles.input}
        />
        <Pressable
          onPress={handleVerify}
          disabled={busy || code.length < 6}
          style={({ pressed }) => [
            styles.primaryButton,
            (busy || code.length < 6) && styles.buttonDisabled,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {busy ? "Verifying…" : "Verify code"}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setStage("email");
            setCode("");
          }}
          hitSlop={8}
          style={({ pressed }) => [
            styles.codeFallback,
            pressed && { opacity: 0.6 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Use a different email"
        >
          <Text style={styles.codeFallbackLabel}>
            ← Use a different email
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={styles.helpText}>
        Enter your email and we&apos;ll send you a 6-digit code. No password
        needed.
      </Text>
      <FieldLabel label="Email" />
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        placeholderTextColor={colors.inkSoft}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        style={styles.input}
      />
      <Pressable
        onPress={handleRequestCode}
        disabled={busy || !email}
        style={({ pressed }) => [
          styles.primaryButton,
          (busy || !email) && styles.buttonDisabled,
          pressed && styles.buttonPressed,
        ]}
      >
        <Text style={styles.primaryButtonText}>
          {busy ? "Sending…" : "Email me a code"}
        </Text>
      </Pressable>
      <Pressable
        onPress={onBack}
        hitSlop={8}
        style={({ pressed }) => [
          styles.codeFallback,
          pressed && { opacity: 0.6 },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Back to password sign-in"
      >
        <Text style={styles.codeFallbackLabel}>
          ← Back to password sign-in
        </Text>
      </Pressable>
    </View>
  );
}

function SignUpForm() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSignUp() {
    if (!isLoaded || !signUp) return;
    setBusy(true);
    try {
      await signUp.create({ emailAddress: email, password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "errors" in err
          ? JSON.stringify((err as { errors: unknown }).errors)
          : String(err);
      Alert.alert("Sign-up failed", message);
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify() {
    if (!isLoaded || !signUp || !setActive) return;
    setBusy(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
      } else {
        Alert.alert("Verification incomplete", `Status: ${result.status}`);
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "errors" in err
          ? JSON.stringify((err as { errors: unknown }).errors)
          : String(err);
      Alert.alert("Verification failed", message);
    } finally {
      setBusy(false);
    }
  }

  if (pendingVerification) {
    return (
      <View style={{ gap: spacing.sm }}>
        <Text style={styles.helpText}>
          Check your email for a 6-digit code. Paste it below.
        </Text>
        <FieldLabel label="Verification code" />
        <TextInput
          value={code}
          onChangeText={setCode}
          placeholder="123456"
          placeholderTextColor={colors.inkSoft}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          style={styles.input}
        />
        <Pressable
          onPress={handleVerify}
          disabled={busy || code.length < 6}
          style={({ pressed }) => [
            styles.primaryButton,
            (busy || code.length < 6) && styles.buttonDisabled,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {busy ? "Verifying…" : "Verify code"}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <FieldLabel label="Email" />
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        placeholderTextColor={colors.inkSoft}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        style={styles.input}
      />
      <FieldLabel label="Password (8+ chars)" />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        placeholderTextColor={colors.inkSoft}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        style={styles.input}
      />
      <Pressable
        onPress={handleSignUp}
        disabled={busy || !email || !password}
        style={({ pressed }) => [
          styles.primaryButton,
          (busy || !email || !password) && styles.buttonDisabled,
          pressed && styles.buttonPressed,
        ]}
      >
        <Text style={styles.primaryButtonText}>
          {busy ? "Creating…" : "Create account"}
        </Text>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Signed-in: identity card + /api/me round-trip diagnostic
// ---------------------------------------------------------------------------

function SignedInView({ email }: { email: string | undefined }) {
  const { signOut, getToken } = useAuth();
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const initial = (email ?? "?").charAt(0).toUpperCase();

  async function handleFetch() {
    setBusy(true);
    setResult(null);
    try {
      const token = await getToken();
      if (!token) {
        setResult("getToken() returned null — Clerk session not active.");
        return;
      }
      const res = await fetch(`${getApiBaseUrl()}/api/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const bodyText = await res.text();
      let pretty = bodyText;
      try {
        pretty = JSON.stringify(JSON.parse(bodyText), null, 2);
      } catch {
        // not JSON; show raw
      }
      setResult(`HTTP ${res.status}\n\n${pretty}`);
    } catch (err) {
      setResult(`Network error: ${String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <View style={{ gap: spacing.lg }}>
      <Card intent="hero" gradient>
        <View style={styles.identityRow}>
          <Halo size={56} glow>
            <Text style={styles.identityInitial}>{initial}</Text>
          </Halo>
          <View style={{ flex: 1, gap: 4 }}>
            <Eyebrow tone="accent">Signed in</Eyebrow>
            <Text style={styles.identityEmail} numberOfLines={1}>
              {email ?? "—"}
            </Text>
          </View>
          <Pressable
            onPress={handleSignOut}
            disabled={signingOut}
            hitSlop={8}
            style={({ pressed }) => [
              styles.signOutButton,
              signingOut && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
          >
            <Text style={styles.signOutLabel}>
              {signingOut ? "…" : "Sign out"}
            </Text>
          </Pressable>
        </View>
      </Card>

      <Card>
        <View style={{ gap: spacing.md }}>
          <Eyebrow tone="soft">Connection check</Eyebrow>
          <Text style={styles.body}>
            Fetch the authenticated snapshot from the server and inspect the
            result. Useful for confirming sync is working.
          </Text>
          <Pressable
            onPress={handleFetch}
            disabled={busy}
            style={({ pressed }) => [
              styles.primaryButton,
              busy && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {busy ? "Fetching…" : "Fetch /api/me"}
            </Text>
          </Pressable>
          {result ? (
            <View style={styles.resultBlock}>
              <Text style={styles.mono} selectable>
                {result}
              </Text>
            </View>
          ) : null}
        </View>
      </Card>

      <Card>
        <View style={{ gap: spacing.xs }}>
          <Eyebrow tone="soft">API base URL</Eyebrow>
          <Text style={styles.mono} selectable>
            {getApiBaseUrl() || "(empty)"}
          </Text>
        </View>
      </Card>
    </View>
  );
}

function FieldLabel({ label }: { label: string }) {
  return (
    <View style={styles.fieldLabelWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
    </View>
  );
}

// Small gilt chip with an icon + one-word label. Sits in a row of three
// above the OAuth providers as the editorial reason to sign in.
function BenefitChip({
  glyph,
  label,
}: {
  glyph: React.ComponentProps<typeof Feather>["name"];
  label: string;
}) {
  return (
    <View style={styles.benefitChip}>
      <Feather name={glyph} size={11} color={colors.accent} />
      <Text style={styles.benefitChipLabel}>{label}</Text>
    </View>
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
    paddingTop: spacing.xl,
    paddingBottom: spacing["4xl"],
    gap: spacing.lg,
  },
  loadingBlock: {
    paddingVertical: spacing["4xl"],
    alignItems: "center",
  },
  loadingLabel: {
    fontFamily: fonts.serifItalic,
    fontSize: 15,
    color: colors.inkMuted,
  },
  benefitsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
  },
  benefitChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: "rgba(212, 168, 87, 0.06)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
  },
  benefitChipLabel: {
    fontFamily: fonts.sans,
    fontSize: 10.5,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  heroBlock: { gap: spacing.xs, alignItems: "center" },
  heroTitle: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 36,
    color: colors.ink,
    letterSpacing: -0.8,
    lineHeight: 40,
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: "center",
    lineHeight: 21,
    paddingHorizontal: spacing.md,
  },
  body: {
    fontSize: 14,
    color: colors.inkMuted,
    lineHeight: 21,
  },
  helpText: {
    fontSize: 13,
    color: colors.inkMuted,
    lineHeight: 19,
    fontStyle: "italic",
  },
  mono: {
    fontFamily: fonts.mono,
    fontSize: 11.5,
    color: colors.ink,
    lineHeight: 17,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.lineGilt,
  },
  dividerLabel: {
    fontSize: 9.5,
    color: colors.accent,
    letterSpacing: 2.4,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  oauthButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.card,
  },
  oauthButtonApple: { backgroundColor: "#000000" },
  oauthButtonAppleLabel: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: "#ffffff",
    fontWeight: "600",
  },
  oauthButtonGoogle: {
    backgroundColor: colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  oauthButtonGoogleLabel: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.ink,
    fontWeight: "600",
  },
  modeRow: {
    flexDirection: "row",
    gap: spacing.xs,
    backgroundColor: colors.background,
    padding: 3,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    alignItems: "center",
  },
  modeButtonActive: {
    backgroundColor: colors.accentSoft,
  },
  modeButtonText: {
    fontFamily: fonts.serif,
    fontSize: 14,
    color: colors.inkMuted,
  },
  modeButtonTextActive: { color: colors.accent, fontWeight: "600" },
  fieldLabelWrap: { marginTop: 4 },
  fieldLabel: {
    fontSize: 10.4,
    color: colors.inkSoft,
    letterSpacing: 2.4,
    textTransform: "uppercase",
    fontWeight: "500",
  },
  input: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.background,
    color: colors.ink,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: fonts.mono,
  },
  primaryButton: {
    borderRadius: radii.card,
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  primaryButtonText: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.background,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  buttonDisabled: { opacity: 0.45 },
  buttonPressed: { opacity: 0.75 },
  codeFallback: {
    paddingVertical: spacing.sm,
    alignSelf: "center",
  },
  codeFallbackLabel: {
    fontFamily: fonts.serifItalic,
    fontSize: 13,
    color: colors.accent,
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  identityInitial: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 26,
    color: colors.accent,
  },
  identityEmail: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  signOutButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(139, 58, 58, 0.4)",
    backgroundColor: "rgba(139, 58, 58, 0.06)",
  },
  signOutLabel: {
    fontFamily: fonts.serif,
    fontSize: 12,
    color: colors.oxbloodInk,
  },
  resultBlock: {
    padding: spacing.md,
    borderRadius: radii.card,
    backgroundColor: colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
});

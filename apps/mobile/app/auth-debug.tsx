// Temporary debug screen for verifying the Phase 1 auth flow end-to-end on
// mobile. Replaced by the proper onboarding screens in Phase 3.
//
// What it does:
//   - Signed out: minimal email + password sign-in / sign-up form via
//     Clerk's useSignIn / useSignUp hooks.
//   - Signed in: shows the Clerk user's email, lets you sign out, and has
//     a "Fetch /api/me" button that hits the local Next dev server (in dev)
//     or the Vercel deploy (in production) with the Clerk JWT and prints
//     the parsed snapshot.

import {
  useAuth,
  useSignIn,
  useSignUp,
  useSSO,
  useUser,
} from "@clerk/clerk-expo";
import { Stack } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, fonts, radii, spacing, text } from "@/constants/theosis-theme";
import { getApiBaseUrl } from "@/lib/api";

export default function AuthDebugScreen() {
  const { isLoaded: userLoaded, isSignedIn, user } = useUser();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Stack.Screen
        options={{
          title: "Auth debug",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.ink,
          headerShadowVisible: false,
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.titleBlock}>
            <Text style={text.eyebrow}>Phase 1 verification</Text>
            <Text style={styles.title}>Auth debug</Text>
            <Text style={styles.subtitle}>
              Temporary screen to verify the end-to-end auth + /api/me flow.
              Replaced by the proper onboarding in Phase 3.
            </Text>
          </View>

          {!userLoaded ? (
            <View style={styles.card}>
              <Text style={styles.body}>Loading Clerk…</Text>
            </View>
          ) : isSignedIn ? (
            <SignedInView email={user?.primaryEmailAddress?.emailAddress} />
          ) : (
            <SignedOutView />
          )}

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>API base URL</Text>
            <Text style={styles.mono}>{getApiBaseUrl() || "(unset)"}</Text>
            <Text style={styles.hint}>
              In dev this is the LAN URL of your Next dev server (port 3000).
              Make sure the Next server is running with `npm run dev:mobile`
              so it binds to 0.0.0.0 and the phone can reach it.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Signed-out view: email + password sign-in / sign-up forms
// ---------------------------------------------------------------------------

function SignedOutView() {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");

  // Warm up / cool down the browser session so the OAuth handoff doesn't
  // need to spin up a cold Safari View Controller / Chrome Custom Tab on
  // first tap. Clerk's docs recommend this; harmless if it errors.
  useEffect(() => {
    void WebBrowser.warmUpAsync().catch(() => {});
    return () => {
      void WebBrowser.coolDownAsync().catch(() => {});
    };
  }, []);

  return (
    <View style={{ gap: spacing.md }}>
      <OAuthButtons />

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerLabel}>OR EMAIL</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.modeRow}>
        <Pressable
          onPress={() => setMode("sign-in")}
          style={[
            styles.modeButton,
            mode === "sign-in" && styles.modeButtonActive,
          ]}
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
        >
          <Text
            style={[
              styles.modeButtonText,
              mode === "sign-up" && styles.modeButtonTextActive,
            ]}
          >
            Sign up
          </Text>
        </Pressable>
      </View>

      {mode === "sign-in" ? <SignInForm /> : <SignUpForm />}
    </View>
  );
}

// Apple + Google sign-in via Clerk's useSSO. Each tap opens the system
// browser (or in-app Safari View on iOS) at Clerk's OAuth start URL,
// returns the session, and setActive flips the local Clerk session.
// The redirect URL `mobile://oauth-native-callback` is configured in
// the Clerk dashboard for this instance.
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
        // User closed the browser — silent no-op.
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
      Alert.alert(`${provider} sign-in failed`, message);
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
          <Text style={styles.oauthButtonAppleLabel}>
            {busyProvider === "apple" ? "Opening…" : " Continue with Apple"}
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
        <Text style={styles.oauthButtonGoogleLabel}>
          {busyProvider === "google" ? "Opening…" : "Continue with Google"}
        </Text>
      </Pressable>
    </View>
  );
}

function SignInForm() {
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
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>Sign in</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="email"
        placeholderTextColor={colors.inkSoft}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        style={styles.input}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="password"
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

  return (
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>Sign up</Text>
      {!pendingVerification ? (
        <>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="email"
            placeholderTextColor={colors.inkSoft}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            style={styles.input}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="password (8+ chars)"
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
              {busy ? "Creating…" : "Sign up"}
            </Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.body}>
            Check your email for the 6-digit code. Paste it below.
          </Text>
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
        </>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Signed-in view: sign-out, fetch /api/me, display result
// ---------------------------------------------------------------------------

function SignedInView({ email }: { email: string | undefined }) {
  const { signOut, getToken } = useAuth();
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  return (
    <View style={{ gap: spacing.md }}>
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Signed in</Text>
        <Text style={styles.body}>{email ?? "(no primary email)"}</Text>
        <Pressable
          onPress={() => signOut()}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.secondaryButtonText}>Sign out</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>GET /api/me</Text>
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
            {busy ? "Fetching…" : "Fetch snapshot"}
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
    gap: spacing.lg,
  },
  titleBlock: { gap: spacing.xs },
  title: {
    fontFamily: fonts.serif,
    fontSize: 32,
    color: colors.ink,
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 13,
    color: colors.inkMuted,
    lineHeight: 19,
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
  sectionLabel: {
    fontFamily: fonts.serif,
    fontSize: 18,
    color: colors.accent,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.inkMuted,
  },
  hint: {
    fontSize: 12,
    color: colors.inkSoft,
    lineHeight: 18,
  },
  mono: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.ink,
    lineHeight: 18,
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
    backgroundColor: colors.line,
  },
  dividerLabel: {
    fontSize: 10,
    color: colors.inkSoft,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  oauthButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.card,
    alignItems: "center",
    justifyContent: "center",
  },
  oauthButtonApple: {
    backgroundColor: "#000000",
  },
  oauthButtonAppleLabel: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: "#ffffff",
    fontWeight: "600",
  },
  oauthButtonGoogle: {
    backgroundColor: colors.surface,
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
    gap: spacing.sm,
  },
  modeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: "center",
  },
  modeButtonActive: {
    borderColor: "rgba(212, 168, 87, 0.5)",
    backgroundColor: colors.accentSoft,
  },
  modeButtonText: {
    fontFamily: fonts.serif,
    fontSize: 15,
    color: colors.inkMuted,
  },
  modeButtonTextActive: {
    color: colors.accent,
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
    letterSpacing: 0.2,
  },
  secondaryButton: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontFamily: fonts.serif,
    fontSize: 15,
    color: colors.ink,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonPressed: { opacity: 0.7 },
  resultBlock: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.card,
    backgroundColor: colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
});

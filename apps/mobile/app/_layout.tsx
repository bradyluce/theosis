import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { ThemeProvider } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { useFonts } from 'expo-font';
import { Stack, router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { ErrorBoundary } from '@/components/theosis/error-boundary';
import { navigationTheme } from '@/constants/theosis-theme';
import { setActiveTokenGetter } from '@/lib/auth';
import { getOnboardingStatus } from '@/lib/preferences';
import { queryClient } from '@/lib/query-client';
import { hydrateAndClaim } from '@/lib/sync/hydrate';
import { drainQueue } from '@/lib/sync/queue';

// SecureStore-backed token cache for Clerk. Clerk's expo SDK persists the
// session JWT under whichever key it likes; we just bridge get/save/clear
// through SecureStore so the token survives across cold starts but isn't
// in plain AsyncStorage.
//
// Failure mode: if SecureStore is unavailable (rare — sandboxed simulators,
// rooted devices with broken Keychain), token reads return null and the
// app behaves as if signed-out. Writes are silently dropped; the user will
// have to sign in again on every cold start. We log warnings so the
// degradation is visible in Xcode / adb logcat instead of being a black
// box, but there's no recovery short of re-installing the app.
const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (err) {
      console.warn(
        "[theosis] SecureStore.getItemAsync failed; treating as unauthenticated:",
        err,
      );
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (err) {
      console.warn(
        "[theosis] SecureStore.setItemAsync failed; session will not survive a cold start:",
        err,
      );
    }
  },
};

// Publishable key comes from app.json `extra.clerkPublishableKey`. Clerk
// publishable keys are embeddable-by-design — they identify the instance and
// cannot mint sessions — so committing it is safe; it is NOT a secret. The
// value is currently hardcoded in app.json; to rotate it or stage a different
// instance, edit app.json (or wire up app.config.* to read an EAS env var).
// Missing key in production is a config error, but we don't want to crash dev
// builds — pass an empty string and let Clerk error loudly at first auth.
const publishableKey =
  (Constants.expoConfig?.extra?.clerkPublishableKey as string | undefined) ??
  '';

// Direct require()s of the two Newsreader weights we use. Avoids importing
// `@expo-google-fonts/newsreader` as a barrel — Metro follows every TTF
// in that index.js (200 / 300 / 400 / 500 / 600 / 700 / 800 + italics), and
// any missing file in the package install fails the whole bundle. Pulling
// the .ttf paths in by hand keeps the bundle small and resolves only the
// weights we actually load. The keys here become the `fontFamily` names
// elsewhere — keep in sync with constants/theosis-theme.ts.
// Five weight/style variants used by the elite type system:
//   400 — body prose, default
//   400 italic — pull quotes, bylines, display numerals
//   500 — emphasis in body
//   600 — title weight (standard)
//   600 italic — display headings, drop caps, hero titles
// Adding new weights is +~50 KB each; keep this list minimal.
const FONT_ASSETS = {
   
  Newsreader_400Regular: require('@expo-google-fonts/newsreader/400Regular/Newsreader_400Regular.ttf'),
   
  Newsreader_400Regular_Italic: require('@expo-google-fonts/newsreader/400Regular_Italic/Newsreader_400Regular_Italic.ttf'),
   
  Newsreader_500Medium: require('@expo-google-fonts/newsreader/500Medium/Newsreader_500Medium.ttf'),
   
  Newsreader_600SemiBold: require('@expo-google-fonts/newsreader/600SemiBold/Newsreader_600SemiBold.ttf'),
   
  Newsreader_600SemiBold_Italic: require('@expo-google-fonts/newsreader/600SemiBold_Italic/Newsreader_600SemiBold_Italic.ttf'),
};

// Keep the native splash screen up until web fonts finish loading. Without
// this, the first frame renders with the system serif fallback and re-flows
// the moment Newsreader becomes available — distracting on cold start.
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  // Loading two weights covers everything in the theme — regular body for
  // most headlines, semibold for emphasized titles. Add more weights to
  // FONT_ASSETS above if a specific screen ever needs them; each adds
  // ~50 KB to the bundle.
  const [fontsLoaded] = useFonts(FONT_ASSETS);
  // Escape hatch for the splash gate. The fonts are bundled .ttf files, so the
  // realistic failure is a corrupted asset decode that leaves useFonts() at
  // [false] forever — which would otherwise strand the user on the native
  // splash indefinitely. After a timeout we proceed anyway with the system
  // serif fallback; Newsreader swaps in later if it ever resolves.
  const [fontTimedOut, setFontTimedOut] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setFontTimedOut(true), 4000);
    return () => clearTimeout(timer);
  }, []);
  const splashReady = fontsLoaded || fontTimedOut;

  useEffect(() => {
    if (splashReady) {
      SplashScreen.hideAsync().catch(() => {
        // Splash already hidden — no-op.
      });
    }
  }, [splashReady]);

  // Apply EAS Updates eagerly on cold start. The default expo-updates
  // behavior downloads a new update on one launch but only *applies* it on
  // the NEXT launch — so a freshly published fix appears a relaunch late,
  // which made it look like fixes "weren't working." Here we check, fetch,
  // and reload in one go so the latest published JS is live on this launch.
  // Gated on Updates.isEnabled: false in Expo Go and while running from the
  // Metro dev server, true only in builds that actually consume a channel.
  useEffect(() => {
    if (!Updates.isEnabled) return;
    let canceled = false;
    void (async () => {
      try {
        const check = await Updates.checkForUpdateAsync();
        if (canceled || !check.isAvailable) return;
        await Updates.fetchUpdateAsync();
        if (canceled) return;
        await Updates.reloadAsync();
      } catch {
        // Offline, no channel, or check failed — keep running the bundle
        // we have. The update will apply on a later launch.
      }
    })();
    return () => {
      canceled = true;
    };
  }, []);

  if (!splashReady) {
    // Returning null keeps the splash screen visible (we deferred autohide)
    // until fonts load OR the 4s timeout above fires — so a corrupted font
    // asset degrades to the system fallback instead of an infinite splash.
    return null;
  }

  return (
    <ErrorBoundary>
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
    <ClerkTokenBridge />
    <OnboardingRedirect />
    <GestureHandlerRootView style={{ flex: 1 }}>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={navigationTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="commentary/[book]/[chapter]/[verse]"
            options={{ presentation: 'modal', headerShown: false }}
          />
          <Stack.Screen
            name="book-picker"
            options={{ presentation: 'modal', headerShown: false }}
          />
          {/* people/[slug], works/[slug], reading/[work]/[order] are
              stack pushes (not modals) so the back button chain reads
              Library → Person → Work → Reading. Each screen sets its
              own headerShown / headerBackTitle via Stack.Screen. */}
          <Stack.Screen name="people/[slug]" />
          <Stack.Screen name="works/[slug]" />
          <Stack.Screen name="reading/[work]/[order]" />
          <Stack.Screen name="prayer" />
          <Stack.Screen
            name="prayer-picker"
            options={{ presentation: "modal", headerShown: true }}
          />
          <Stack.Screen name="settings" />
          {/* Phase 3 onboarding flow. Each step is its own file under
              app/onboarding/; the index screen redirects to the user's
              current step. Header hidden — the OnboardingShell renders
              its own progress dots. */}
          <Stack.Screen
            name="onboarding"
            options={{ headerShown: false, gestureEnabled: false }}
          />
          {/* Sign-in / sign-up screen. Reachable from Settings → Account
              and from the Phase 3 onboarding "Sign in / Sign up" step. */}
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          {/* Patron-saint searchable picker. Modal so we get the iOS
              swipe-down dismiss + Settings/onboarding screen behind. */}
          <Stack.Screen
            name="saint-picker"
            options={{ presentation: "modal", headerShown: false }}
          />
          {/* Parish locator. parishes is the list/search entry, reachable
              from the You tab. parishes/[state]/[slug] is the per-parish
              detail screen pushed when a row in the list is tapped. */}
          <Stack.Screen name="parishes" />
          <Stack.Screen name="parishes/[state]/[slug]" />
          {/* Commentary fathers picker — full screen, regular push (not
              modal) so the user can dig back to settings cleanly. */}
          <Stack.Screen name="commentary-fathers" />
          {/* Diptych — names to pray for. */}
          <Stack.Screen name="diptych" />
          {/* Prayer rule builder — full corpus browser with PDF export. */}
          <Stack.Screen name="prayer-builder" />
          {/* Legal — Terms of Service + Privacy Policy. App Store
              requires both. */}
          <Stack.Screen name="terms" />
          <Stack.Screen name="privacy" />
          {/* Note editor — write a note anchored to a verse / chapter /
              work / person. */}
          <Stack.Screen name="note/[targetType]/[targetId]" />
        </Stack>
        <StatusBar style="light" />
      </ThemeProvider>
    </QueryClientProvider>
    </GestureHandlerRootView>
    </ClerkProvider>
    </ErrorBoundary>
  );
}

// Sits inside <ClerkProvider> so it can call useAuth(); registers Clerk's
// getToken() with our non-component auth module so any code path can later
// call getAuthedApi() without needing access to a hook. On sign-in:
// triggers hydrateAndClaim() (which posts /api/me/import if there's any
// anonymous local data, then fetches the server snapshot and adopts it),
// then drains any queued pending writes. Re-registers on sign-in / sign-
// out flips so the cached api client gets rebuilt with a fresh closure
// over the new session.
function ClerkTokenBridge() {
  const { getToken, isSignedIn, userId } = useAuth();
  useEffect(() => {
    if (isSignedIn && userId) {
      setActiveTokenGetter(() => getToken());
      // Drain queued offline writes BEFORE hydrating. hydrate's
      // adoptServerSnapshot replaces local synced collections with the server
      // state, so draining first pushes any pending local edits to the server
      // and then adopts the merged result — instead of overwriting un-flushed
      // edits with a stale server snapshot. The import path is idempotent
      // (ON CONFLICT DO NOTHING), so a first-claim re-send is harmless.
      void drainQueue().then(() => hydrateAndClaim({ clerkUserId: userId }));
    } else {
      setActiveTokenGetter(null);
    }
  }, [getToken, isSignedIn, userId]);
  return null;
}

// Onboarding guard. On cold start, reads the persisted onboardingStatus
// and pushes to /onboarding if the user hasn't completed it. Runs once
// after fonts load — by that point Expo Router has a navigator.
function OnboardingRedirect() {
  useEffect(() => {
    let canceled = false;
    void getOnboardingStatus().then((status) => {
      if (canceled) return;
      if (status === "needs_onboarding" || status === "anonymous") {
        router.replace("/onboarding");
      }
    });
    return () => {
      canceled = true;
    };
  }, []);
  return null;
}

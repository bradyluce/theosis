import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { ThemeProvider } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { useFonts } from 'expo-font';
import { Stack, router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

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
const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Keychain/Keystore unavailable — fall through silently. Clerk will
      // re-issue the token on next sign-in.
    }
  },
};

// Publishable key comes from app.json `extra.clerkPublishableKey` (set per
// build via EAS env vars). Missing key in production is a config error,
// but we don't want to crash dev builds — pass an empty string and let
// Clerk error loudly at the first auth attempt instead.
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
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Newsreader_400Regular: require('@expo-google-fonts/newsreader/400Regular/Newsreader_400Regular.ttf'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Newsreader_400Regular_Italic: require('@expo-google-fonts/newsreader/400Regular_Italic/Newsreader_400Regular_Italic.ttf'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Newsreader_500Medium: require('@expo-google-fonts/newsreader/500Medium/Newsreader_500Medium.ttf'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Newsreader_600SemiBold: require('@expo-google-fonts/newsreader/600SemiBold/Newsreader_600SemiBold.ttf'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
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

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {
        // Splash already hidden — no-op.
      });
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    // Returning null keeps the splash screen visible (we deferred autohide).
    // If a font CDN ever fails, the catch above won't trigger here — the
    // useFonts hook returns [false] indefinitely; that's acceptable for a
    // first-launch failure mode (manifests as the splash staying up).
    return null;
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
    <ClerkTokenBridge />
    <OnboardingRedirect />
    <GestureHandlerRootView style={{ flex: 1 }}>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={navigationTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="modal"
            options={{ presentation: 'modal', title: 'Modal' }}
          />
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
          {/* Temporary Phase 1 verification screen. Reachable from
              Settings → Account; also used as the sign-in screen in
              Phase 3 onboarding step 10. */}
          <Stack.Screen name="auth-debug" options={{ headerShown: false }} />
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
        </Stack>
        <StatusBar style="light" />
      </ThemeProvider>
    </QueryClientProvider>
    </GestureHandlerRootView>
    </ClerkProvider>
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
      // Order matters: claim + hydrate first (writes are server-wins on
      // natural keys), then drain anything that was queued before the
      // most recent sign-out.
      void hydrateAndClaim({ clerkUserId: userId }).then(() => drainQueue());
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

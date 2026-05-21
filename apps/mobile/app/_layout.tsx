import { ThemeProvider } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { navigationTheme } from '@/constants/theosis-theme';
import { queryClient } from '@/lib/query-client';

// Direct require()s of the two Newsreader weights we use. Avoids importing
// `@expo-google-fonts/newsreader` as a barrel — Metro follows every TTF
// in that index.js (200 / 300 / 400 / 500 / 600 / 700 / 800 + italics), and
// any missing file in the package install fails the whole bundle. Pulling
// the .ttf paths in by hand keeps the bundle small and resolves only the
// weights we actually load. The keys here become the `fontFamily` names
// elsewhere — keep in sync with constants/theosis-theme.ts.
const FONT_ASSETS = {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Newsreader_400Regular: require('@expo-google-fonts/newsreader/400Regular/Newsreader_400Regular.ttf'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Newsreader_600SemiBold: require('@expo-google-fonts/newsreader/600SemiBold/Newsreader_600SemiBold.ttf'),
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
        </Stack>
        <StatusBar style="light" />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

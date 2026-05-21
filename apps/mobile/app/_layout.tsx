import { ThemeProvider } from '@react-navigation/native';
import {
  Newsreader_400Regular,
  Newsreader_600SemiBold,
  useFonts,
} from '@expo-google-fonts/newsreader';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { navigationTheme } from '@/constants/theosis-theme';
import { queryClient } from '@/lib/query-client';

// Keep the native splash screen up until web fonts finish loading. Without
// this, the first frame renders with the system serif fallback and re-flows
// the moment Newsreader becomes available — distracting on cold start.
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  // Loading two weights covers everything in the theme — regular body for
  // most headlines, semibold for emphasized titles. Add more weights here
  // if specific screens need them; each adds ~50KB to the bundle.
  const [fontsLoaded] = useFonts({
    Newsreader_400Regular,
    Newsreader_600SemiBold,
  });

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

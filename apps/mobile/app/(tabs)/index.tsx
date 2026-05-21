import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { getApi, getApiBaseUrl } from "@/lib/api";

// Step-3 Hello screen. Proves the workspace plumbing works end-to-end:
//   - @theosis/core resolves via the file: dep
//   - The typed API client builds a URL against the local dev server
//   - React Query handles fetch/cache/error states
//   - Expo Router renders this at the Home tab
//
// Uses ThemedText/ThemedView from the SDK 54 template so colors adapt
// to light/dark mode. (React Native's raw <Text> defaults to BLACK,
// invisible against React Navigation's DarkTheme dark background.)
//
// Step 4 will replace this with the Daily Commemoration screen.

export default function HomeScreen() {
  const api = getApi();
  const baseUrl = getApiBaseUrl();
  const { data, error, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["version"],
    queryFn: () => api.fetchVersion(),
    staleTime: 60 * 1000,
  });

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <ThemedText style={styles.eyebrow}>Theosis</ThemedText>
          <ThemedText style={styles.headline}>Mobile is alive.</ThemedText>
          <ThemedText style={styles.muted}>API base: {baseUrl}</ThemedText>

          <ThemedView style={styles.card} darkColor="#1a1a1a" lightColor="#f5f5f5">
            <ThemedText style={styles.cardLabel}>/api/version</ThemedText>
            {isLoading ? <ActivityIndicator /> : null}
            {error ? (
              <ThemedText style={styles.error}>
                {error instanceof Error ? error.message : String(error)}
              </ThemedText>
            ) : null}
            {data ? (
              <View style={styles.kvList}>
                <KeyValue label="commit" value={data.commit} />
                <KeyValue label="branch" value={data.branch} />
                <KeyValue label="environment" value={data.environment} />
              </View>
            ) : null}
          </ThemedView>

          <ThemedText style={styles.muted}>
            {isFetching ? "Fetching…" : "Tap to retry"}
          </ThemedText>
          <ThemedText style={styles.linkLike} onPress={() => refetch()}>
            Retry
          </ThemedText>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kvRow}>
      <ThemedText style={styles.kvKey}>{label}</ThemedText>
      <ThemedText style={styles.kvValue}>{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 16,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 2,
    textTransform: "uppercase",
    opacity: 0.6,
  },
  headline: { fontSize: 28, fontWeight: "600" },
  muted: { fontSize: 13, opacity: 0.65 },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(127,127,127,0.4)",
    gap: 12,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    opacity: 0.7,
  },
  kvList: { gap: 6 },
  kvRow: { flexDirection: "row", justifyContent: "space-between" },
  kvKey: { fontSize: 13, opacity: 0.65 },
  kvValue: { fontSize: 14, fontFamily: "Menlo" },
  error: { color: "#c43d3d", fontSize: 13 },
  linkLike: {
    color: "#3b6cd9",
    fontSize: 14,
    fontWeight: "600",
    paddingVertical: 8,
  },
});

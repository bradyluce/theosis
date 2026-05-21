import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getApi, getApiBaseUrl } from "@/lib/api";

// Step-3 Hello screen. Proves the workspace plumbing works end-to-end:
//   - @theosis/core resolves through the workspace symlink
//   - The typed API client builds a URL against the local dev server
//   - React Query handles fetch/cache/error states
//   - Expo Router renders this at the Home tab
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
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>Theosis</Text>
        <Text style={styles.headline}>Mobile is alive.</Text>
        <Text style={styles.muted}>API base: {baseUrl}</Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>/api/version</Text>
          {isLoading ? <ActivityIndicator /> : null}
          {error ? (
            <Text style={styles.error}>
              {error instanceof Error ? error.message : String(error)}
            </Text>
          ) : null}
          {data ? (
            <View style={styles.kvList}>
              <KeyValue label="commit" value={data.commit} />
              <KeyValue label="branch" value={data.branch} />
              <KeyValue label="environment" value={data.environment} />
            </View>
          ) : null}
        </View>

        <Text style={styles.muted}>
          {isFetching ? "Fetching…" : "Tap to retry"}
        </Text>
        <Text style={styles.linkLike} onPress={() => refetch()}>
          Retry
        </Text>
      </View>
    </SafeAreaView>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvKey}>{label}</Text>
      <Text style={styles.kvValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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

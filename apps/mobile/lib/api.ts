import Constants from "expo-constants";
import { createTheosisApi, type TheosisApi } from "@theosis/core";

// Resolve the API base URL based on runtime context:
// - In Expo Go on a real device, `localhost` resolves to the device itself,
//   so we need the dev machine's LAN IP. Expo exposes that via
//   `Constants.expoConfig.hostUri` (format `IP:PORT`); we drop Metro's port
//   and target the Next.js dev server's port (3000).
// - In production builds, point at the deployed Vercel URL. Replace the
//   placeholder once the production deployment URL is set up.
//
// The web Next.js dev server must bind to 0.0.0.0 for the iPhone to reach
// it. The web app's `dev:mobile` script does that: `next dev -H 0.0.0.0`.
function resolveApiBaseUrl(): string {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(":")[0];
    return `http://${host}:3000`;
  }
  // TODO: replace with the actual Vercel production URL once provisioned.
  return "https://theosis.vercel.app";
}

let cached: TheosisApi | null = null;

export function getApi(): TheosisApi {
  if (!cached) {
    cached = createTheosisApi({ baseUrl: resolveApiBaseUrl() });
  }
  return cached;
}

export function getApiBaseUrl(): string {
  return resolveApiBaseUrl();
}

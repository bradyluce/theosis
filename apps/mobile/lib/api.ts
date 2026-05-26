import Constants from "expo-constants";
import { createTheosisApi, type TheosisApi } from "@theosis/core";

// Resolve the API base URL based on runtime context:
//
//   1. Development (Metro is serving the JS) — `expoConfig.hostUri` is set to
//      the dev machine's `IP:PORT`. Strip the Metro port and target the
//      Next.js dev server's port 3000. The Next.js `dev:mobile` script binds
//      to 0.0.0.0 so the phone can reach it on the LAN.
//   2. Published / production — `hostUri` is undefined. Read the deployed API
//      URL out of `expoConfig.extra.apiBaseUrl` (set in app.json). Updating
//      that value + running `eas update` repoints the bundle at a new host
//      without touching native code.
//
// The fallback string at the end of `resolveApiBaseUrl` is only there to keep
// the function total — if `extra.apiBaseUrl` is missing in a published bundle
// that's a config error, and the empty string will make every request fail
// fast with an obvious URL in the error.
function resolveApiBaseUrl(): string {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(":")[0];
    return `http://${host}:3000`;
  }
  const configured = Constants.expoConfig?.extra?.apiBaseUrl;
  if (typeof configured === "string" && configured.length > 0) {
    return configured.replace(/\/$/, "");
  }
  return "";
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

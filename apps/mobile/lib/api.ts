import Constants from "expo-constants";
import { createTheosisApi, type TheosisApi } from "@theosis/core";

// Resolve the API base URL based on runtime context:
//
//   1. Local Metro development — `expoConfig.hostUri` is set to the dev
//      machine's LAN IP:PORT. Strip the Metro port and target the Next
//      dev server on :3000 (Next's `dev:mobile` script binds to 0.0.0.0
//      so the phone can reach it on the LAN).
//   2. EAS Update / production bundle — fall through to `extra.apiBaseUrl`
//      from app.json (set to the Vercel deploy).
//
// Gotcha: Expo Go populates `hostUri` even when you open an EAS Update
// from the Expo dashboard (the value is the update host like
// `u.expo.dev/...`, not a LAN IP). The naive `if (hostUri)` check we had
// before treated those launches as local dev, producing
// `http://u.expo.dev:3000` and silent timeouts. Tighten the check to:
// only treat hostUri as a dev signal when BOTH __DEV__ is true AND the
// host parses as a LAN IPv4 / localhost.

function isLanHost(host: string): boolean {
  if (host === "localhost" || host === "127.0.0.1") return true;
  // RFC1918 private ranges + link-local. Quick regex covers the common
  // home/office networks without pulling in a full IP library.
  return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/.test(host);
}

function resolveApiBaseUrl(): string {
  const hostUri = Constants.expoConfig?.hostUri;
  // React Native ships __DEV__ as a global; declared on globalThis for
  // type-safety. False in EAS Update / production bundles.
  const dev =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    typeof (globalThis as any).__DEV__ !== "undefined"
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).__DEV__
      : false;
  if (dev && hostUri) {
    const host = hostUri.split(":")[0];
    if (isLanHost(host)) {
      return `http://${host}:3000`;
    }
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

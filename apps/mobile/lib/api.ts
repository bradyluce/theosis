import Constants from "expo-constants";
import { createTheosisApi, type TheosisApi } from "@theosis/core";

// Resolve the API base URL based on runtime context:
//
//   1. Local Metro development — `expoConfig.hostUri` is set to the dev
//      machine's LAN IP:PORT, and __DEV__ is true. Strip the Metro port
//      and target the Next dev server on :3000 (Next's `dev:mobile`
//      script binds to 0.0.0.0 so the phone can reach it on the LAN).
//   2. EAS Update / production bundle — fall through to the configured
//      Vercel deploy. We check `expoConfig.extra`, `manifest2.extra`
//      (the EAS Update manifest path on SDK 54), AND a hardcoded
//      constant — belt-and-braces because Constants surfaces drift
//      between Expo versions and a missing URL silently times every
//      request out.
//
// Gotcha: Expo Go populates `hostUri` even when you launch an EAS
// Update from the dashboard (the value is the update host like
// `u.expo.dev/...`, not a LAN IP). The check below tightens the dev
// signal to BOTH `__DEV__ === true` AND a LAN-looking host so
// production launches don't get misrouted to `http://u.expo.dev:3000`.

const HARDCODED_PROD_URL = "https://theosis-app-brady-luces-projects.vercel.app";

function isLanHost(host: string): boolean {
  if (host === "localhost" || host === "127.0.0.1") return true;
  // RFC1918 private ranges + link-local. Quick regex covers the common
  // home/office networks without pulling in a full IP library.
  return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/.test(host);
}

// Pull `extra.apiBaseUrl` from whichever Expo Constants surface exposes
// it for the current runtime. expoConfig.extra is what app.json sets;
// manifest2 is the EAS Update path on SDK 54. We don't trust either
// alone — try both in order, then fall back to the hardcoded URL.
function readConfiguredUrl(): string | null {
  const c = Constants as unknown as {
    expoConfig?: { extra?: { apiBaseUrl?: unknown } };
    manifest2?: {
      extra?: { expoClient?: { extra?: { apiBaseUrl?: unknown } } };
    };
  };
  const fromExpoConfig = c.expoConfig?.extra?.apiBaseUrl;
  if (typeof fromExpoConfig === "string" && fromExpoConfig.length > 0) {
    return fromExpoConfig;
  }
  const fromManifest2 = c.manifest2?.extra?.expoClient?.extra?.apiBaseUrl;
  if (typeof fromManifest2 === "string" && fromManifest2.length > 0) {
    return fromManifest2;
  }
  return null;
}

function resolveApiBaseUrl(): string {
  const dev =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    typeof (globalThis as any).__DEV__ !== "undefined"
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Boolean((globalThis as any).__DEV__)
      : false;

  const hostUri = Constants.expoConfig?.hostUri;
  if (dev && hostUri) {
    const host = hostUri.split(":")[0];
    if (isLanHost(host)) {
      return `http://${host}:3000`;
    }
  }

  const configured = readConfiguredUrl();
  if (configured) return configured.replace(/\/$/, "");
  return HARDCODED_PROD_URL;
}

let cached: TheosisApi | null = null;
let didLogOnce = false;

export function getApi(): TheosisApi {
  if (!cached) {
    const baseUrl = resolveApiBaseUrl();
    if (!didLogOnce) {
      // Single log to confirm which URL the runtime actually picked. If
      // you see "(empty)" or a LAN IP when you expected the Vercel URL,
      // the routing is wrong.
      console.log("[theosis] API base URL:", baseUrl || "(empty)");
      didLogOnce = true;
    }
    cached = createTheosisApi({ baseUrl });
  }
  return cached;
}

export function getApiBaseUrl(): string {
  return resolveApiBaseUrl();
}

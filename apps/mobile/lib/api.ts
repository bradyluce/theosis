import Constants from "expo-constants";
import { createTheosisApi, type TheosisApi } from "@theosis/core";

// Resolve the API base URL.
//
// Default: the configured (Vercel) URL from app.json `extra.apiBaseUrl`,
// even in `__DEV__`. This means `npx expo start` and a remote tester's
// EAS Update both hit the same deployed backend — no second `dev:mobile`
// terminal needed, and the experience matches what testers see.
//
// Opt-in: to run the mobile app against a local Next.js dev server on
// your LAN (for testing unpushed backend changes), set
// `EXPO_PUBLIC_USE_LAN_DEV=1` before launching Metro:
//
//     EXPO_PUBLIC_USE_LAN_DEV=1 npx expo start
//
// and run `npm run dev:mobile` from the repo root in another terminal.
// The phone must be on the same Wi-Fi and Windows Firewall must allow
// inbound 3000.
//
// EXPO_PUBLIC_* env vars are inlined by Metro at bundle time, so the
// flag is fixed for the lifetime of that bundle — restart Metro after
// toggling it.

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
  const useLanDev = process.env.EXPO_PUBLIC_USE_LAN_DEV === "1";

  if (useLanDev) {
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
  }

  const configured = readConfiguredUrl();
  if (configured) return configured.replace(/\/$/, "");
  return HARDCODED_PROD_URL;
}

let cached: TheosisApi | null = null;
let didLogOnce = false;

// Whether we're running under Metro dev (vs. an EAS Update / production
// build). __DEV__ is injected by the React Native runtime; in non-RN
// environments (tests) it's undefined and we treat that as production.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isDev = Boolean((globalThis as any).__DEV__);

export function getApi(): TheosisApi {
  if (!cached) {
    const baseUrl = resolveApiBaseUrl();
    if (isDev && !didLogOnce) {
      // Single log to confirm which URL the runtime actually picked. If
      // you see "(empty)" or a LAN IP when you expected the Vercel URL,
      // the routing is wrong. Gated on __DEV__ so production TestFlight /
      // App Store builds don't echo the URL to the Xcode console.
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

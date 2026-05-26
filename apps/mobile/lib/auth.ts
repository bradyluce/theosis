// Authed mobile API client. Calls into the /api/me/* surface with a Clerk
// session token injected on every request. Phase 1 ships this dormant —
// nothing in preferences.ts calls getAuthedApi() yet (gated by the
// SYNC_ENABLED flag inside preferences.ts). Phase 2 wires the calls up.
//
// Token caching: Clerk's expo SDK stores the JWT in SecureStore for us
// (the tokenCache passed to ClerkProvider in app/_layout.tsx). Here we
// just call getToken() each request — the Clerk SDK handles refresh.

import type { Auth } from "@clerk/types";

import {
  createTheosisMeApi,
  type TheosisMeApi,
} from "@theosis/core/api/me-client";

import { getApiBaseUrl } from "./api";

// Clerk's `getToken` is exposed via `useAuth()` (React hook). We can't call
// a hook from a non-component function, so callers pass us the getter once
// (typically from a top-level provider or screen that has `useAuth()`).
// Phase 2 lands the provider that calls setActiveTokenGetter().

type TokenGetter = (() => Promise<string | null>) | null;

let activeTokenGetter: TokenGetter = null;
let cachedApi: TheosisMeApi | null = null;

export function setActiveTokenGetter(getter: TokenGetter): void {
  activeTokenGetter = getter;
  cachedApi = null; // force rebuild so the new getter is used
}

export function getAuthedApi(): TheosisMeApi | null {
  if (!activeTokenGetter) return null;
  if (cachedApi) return cachedApi;
  cachedApi = createTheosisMeApi({
    baseUrl: getApiBaseUrl(),
    fetchImpl: async (input, init) => {
      const token = activeTokenGetter ? await activeTokenGetter() : null;
      const headers = new Headers(init?.headers);
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return fetch(input, { ...init, headers });
    },
  });
  return cachedApi;
}

// Type re-export for convenience.
export type { Auth };

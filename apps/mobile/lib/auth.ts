// Authed mobile API client. Calls into the /api/me/* surface with a Clerk
// session token injected on every request. Phase 1 ships this dormant —
// nothing in preferences.ts calls getAuthedApi() yet (gated by the
// SYNC_ENABLED flag inside preferences.ts). Phase 2 wires the calls up.
//
// Token threading: Clerk's `getToken` lives on the `useAuth()` hook, which
// can only be called from a React component. A top-level provider (see
// app/_layout.tsx) reads useAuth() and registers its getToken via
// setActiveTokenGetter(); after that, any non-component code path can
// call getAuthedApi() to get an authed client.

import {
  createTheosisMeApi,
  type TheosisMeApi,
} from "@theosis/core/api/me-client";

import { getApiBaseUrl } from "./api";

type TokenGetter = (() => Promise<string | null>) | null;

let activeTokenGetter: TokenGetter = null;
let cachedApi: TheosisMeApi | null = null;

export function setActiveTokenGetter(getter: TokenGetter): void {
  activeTokenGetter = getter;
  cachedApi = null; // force rebuild so the new getter is used on next call
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

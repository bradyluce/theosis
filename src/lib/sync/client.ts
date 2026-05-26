"use client";

// Singleton TheosisMeApi for the web. Same-origin so Clerk's session cookie
// is sent automatically; no Bearer header needed. Module-scoped cache lives
// for the lifetime of the JS bundle.

import { createTheosisMeApi, type TheosisMeApi } from "@theosis/core/api/me-client";

let cached: TheosisMeApi | null = null;

export function getMeApi(): TheosisMeApi {
  if (cached) return cached;
  cached = createTheosisMeApi(); // baseUrl = "" → same origin, credentials: "include"
  return cached;
}

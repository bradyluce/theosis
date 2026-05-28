// Stable per-device UUID for the /api/me/import claim. Stored in
// expo-secure-store; generated lazily on first use. The server only uses
// it to reject a second device trying to claim the same anonymous payload.

import * as SecureStore from "expo-secure-store";

const STORAGE_KEY = "theosis.anonymous-id";

let cached: string | null = null;

// Drop the in-memory cached id so the next ensureAnonymousId() call
// regenerates from SecureStore (or generates a fresh UUID if cleared).
// Called by lib/sync/sign-out.ts.
export function clearAnonymousIdCache(): void {
  cached = null;
}

export async function ensureAnonymousId(): Promise<string> {
  if (cached) return cached;
  try {
    const existing = await SecureStore.getItemAsync(STORAGE_KEY);
    if (existing) {
      cached = existing;
      return existing;
    }
  } catch {
    // Keystore unavailable in this runtime (e.g. Expo Go web) — fall
    // through to generate a session-scoped id.
  }
  // crypto.randomUUID is available in React Native via expo-crypto polyfills
  // in SDK 54. Fallback to a v4-ish manual gen if it's missing.
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : manualUuid();
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, id);
  } catch {
    // Persist failure is fine — cached in memory below.
  }
  cached = id;
  return id;
}

function manualUuid(): string {
  // RFC 4122 v4 enough for our purposes (server only uses it as an opaque token).
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
    16,
    20,
  )}-${hex.slice(20, 32)}`;
}

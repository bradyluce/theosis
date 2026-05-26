"use client";

// Stable per-device UUID used to gate /api/me/import. Generated lazily on
// first use; persisted to localStorage so a re-load reuses the same id.
// Anonymous users who never sign up never get one. Not a tracking id —
// the server only uses it to reject a second device trying to claim the
// same anonymous payload.

const STORAGE_KEY = "theosis.anonymous-id";

export function ensureAnonymousId(): string {
  if (typeof window === "undefined") {
    // SSR — return a placeholder. Hydrate-on-load only runs client-side
    // so the placeholder never reaches the server.
    return "00000000-0000-0000-0000-000000000000";
  }
  let id = window.localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

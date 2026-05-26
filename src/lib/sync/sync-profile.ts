"use client";

// Profile mutations need optimistic-concurrency PATCH (server validates
// expectedVersion). For entity-level writes we use the fire-and-forget
// queue, but profile is small + version-tracked, so we do a fetch-then-
// patch dance synchronously. Failures are logged and dropped — the next
// sign-in hydrates the server's authoritative value, so we don't risk
// permanent divergence.
//
// Also translates the legacy web field names (patronSaintPersonId) into
// the unified shape the server expects (patronSaintSlug). Once Phase 3
// prep migrates the store to the unified shape, this collapses.

import type { UpdateProfileInput } from "@theosis/core/api/me-dtos";

import { useStudyState } from "@/lib/user/use-study-state";
import { getMeApi } from "./client";

export type LegacyProfilePatch = {
  calendarPreference?: "new-calendar" | "old-calendar";
  primaryTranslationId?: string;
  patronSaintPersonId?: string;
  preferredFatherIds?: string[];
  hiddenFatherIds?: string[];
  location?: string;
};

export async function syncProfilePatch(
  patch: LegacyProfilePatch,
): Promise<void> {
  const state = useStudyState.getState();
  if (!state.auth.clerkUserId) return; // anonymous — no sync
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;

  const api = getMeApi();
  try {
    const current = await api.fetchProfile();
    const body: UpdateProfileInput = {
      expectedVersion: current.version,
    };
    if (patch.calendarPreference !== undefined)
      body.calendarPreference = patch.calendarPreference;
    if (patch.primaryTranslationId !== undefined)
      body.primaryTranslationId = patch.primaryTranslationId;
    if (patch.patronSaintPersonId !== undefined)
      body.patronSaintSlug = patch.patronSaintPersonId || null;
    if (patch.preferredFatherIds !== undefined)
      body.preferredFatherIds = patch.preferredFatherIds;
    if (patch.hiddenFatherIds !== undefined)
      body.hiddenFatherIds = patch.hiddenFatherIds;
    if (patch.location !== undefined)
      body.location = patch.location || null;
    await api.patchProfile(body);
  } catch (err) {
    // Swallow — server-side will be reconciled on next sign-in hydrate.
    // (A 409 here means another device patched first; we accept the
    //  divergence rather than refetching + retrying in a loop.)
    console.warn("[sync] profile patch failed", err);
  }
}

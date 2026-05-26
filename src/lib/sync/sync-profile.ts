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
import type { ProfilePreferences } from "@/domain/user/types";

import { useStudyState } from "@/lib/user/use-study-state";
import { getMeApi } from "./client";

// LegacyProfilePatch = ProfilePreferences partial. The local web store uses
// the same field names as the unified server schema with one exception:
// `patronSaintPersonId` here = `patronSaintSlug` on the server. Everything
// else passes through unchanged.
export type LegacyProfilePatch = Partial<ProfilePreferences>;

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
    if (patch.status !== undefined) body.status = patch.status;
    if (patch.jurisdiction !== undefined)
      body.jurisdiction = patch.jurisdiction;
    if (patch.parish !== undefined) body.parish = patch.parish;
    if (patch.parishId !== undefined) body.parishId = patch.parishId;
    if (patch.textSize !== undefined) body.textSize = patch.textSize;
    if (patch.fastingLevel !== undefined)
      body.fastingLevel = patch.fastingLevel;
    if (patch.commentaryRanking !== undefined)
      body.commentaryRanking = patch.commentaryRanking;
    await api.patchProfile(body);
  } catch (err) {
    // Swallow — server-side will be reconciled on next sign-in hydrate.
    // (A 409 here means another device patched first; we accept the
    //  divergence rather than refetching + retrying in a loop.)
    console.warn("[sync] profile patch failed", err);
  }
}

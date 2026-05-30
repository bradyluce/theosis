// Profile-patch helper for mobile. Profile uses optimistic-concurrency
// PATCH (server validates expectedVersion), so we fetch-then-patch
// synchronously. On a 409 version_mismatch (something else bumped the
// row between our fetch and our PATCH — happens when the user makes
// two settings changes in quick succession), we retry once with the
// fresh version from the conflict response. Failures after retry are
// logged + dropped — next sign-in hydrate reconciles.

import type { UpdateProfileInput } from "@theosis/core/api/me-dtos";

import { getAuthedApi } from "@/lib/auth";
import type { ProfilePrefs } from "@/lib/preferences";

// Build the wire-shape PATCH body from a partial mobile ProfilePrefs.
// Pulled out so the retry path reuses the same translation logic.
function buildBody(
  patch: Partial<ProfilePrefs>,
  expectedVersion: number,
): UpdateProfileInput {
  const body: UpdateProfileInput = { expectedVersion };
  if (patch.calendarSystem !== undefined) {
    body.calendarPreference =
      patch.calendarSystem === "julian" ? "old-calendar" : "new-calendar";
  }
  if (patch.patronSaintSlug !== undefined) {
    body.patronSaintSlug = patch.patronSaintSlug || null;
  }
  if (patch.birthday !== undefined) {
    body.birthday = patch.birthday || null;
  }
  if (patch.parish !== undefined) {
    body.parish = patch.parish || null;
  }
  if (patch.status !== undefined) {
    body.status =
      patch.status === "christian"
        ? "orthodox"
        : patch.status === "catechumen"
          ? "catechumen"
          : patch.status === "inquirer"
            ? "inquirer"
            : null;
  }
  if (patch.commentaryRanking !== undefined) {
    body.commentaryRanking = patch.commentaryRanking;
  }
  if (patch.jurisdiction !== undefined) {
    body.jurisdiction = patch.jurisdiction;
  }
  if (patch.fastingLevel !== undefined) {
    body.fastingLevel = patch.fastingLevel;
  }
  if (patch.primaryTranslationId !== undefined) {
    body.primaryTranslationId = patch.primaryTranslationId;
  }
  if (patch.textSize !== undefined) {
    body.textSize = patch.textSize;
  }
  // The commentary-fathers picker stores explicit ordering + hidden
  // lists locally; the server schema names them preferredFatherIds /
  // hiddenFatherIds. Translate both arrays here so the user's
  // customization follows their account across devices.
  if (patch.commentaryFathers !== undefined) {
    body.preferredFatherIds =
      patch.commentaryFathers.orderedSlugs ?? [];
    body.hiddenFatherIds = patch.commentaryFathers.hiddenSlugs ?? [];
  }
  return body;
}

// Parse the server's 409 body and pull out the latest version. The
// shape is { error: "version_mismatch", current: { version: N, ... } }.
// Returns null if the error message can't be parsed.
function extractCurrentVersion(err: unknown): number | null {
  if (!(err instanceof Error)) return null;
  const message = err.message ?? "";
  // The Theosis client throws errors of the form
  //   "Theosis /api/me request failed: 409 {json…}"
  const match = /409\s+(\{.*\})/s.exec(message);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]) as {
      error?: string;
      current?: { version?: number };
    };
    if (parsed?.error === "version_mismatch" && typeof parsed.current?.version === "number") {
      return parsed.current.version;
    }
  } catch {
    // not parseable
  }
  return null;
}

export async function syncProfilePatchMobile(
  patch: Partial<ProfilePrefs>,
): Promise<void> {
  const api = getAuthedApi();
  if (!api) return;

  try {
    const current = await api.fetchProfile();
    const body = buildBody(patch, current.version);
    try {
      await api.patchProfile(body);
    } catch (err) {
      // Optimistic-concurrency conflict: another patch landed between
      // our fetch and our PATCH. Pull the fresh version off the 409
      // body and retry exactly once. If retry also fails, fall through
      // to the warn — the user's local state still wins, and the next
      // hydrate-on-sign-in will reconcile.
      const freshVersion = extractCurrentVersion(err);
      if (freshVersion == null) throw err;
      const retryBody = buildBody(patch, freshVersion);
      await api.patchProfile(retryBody);
    }
  } catch (err) {
    console.warn("[mobile sync] profile patch failed", err);
  }
}

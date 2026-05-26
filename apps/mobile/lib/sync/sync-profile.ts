// Profile-patch helper for mobile. Profile uses optimistic-concurrency
// PATCH (server validates expectedVersion), so we fetch-then-patch
// synchronously. Failures are logged + dropped — next sign-in hydrate
// reconciles. Translates mobile field names → unified server shape.

import type { UpdateProfileInput } from "@theosis/core/api/me-dtos";

import { getAuthedApi } from "@/lib/auth";
import type { ProfilePrefs } from "@/lib/preferences";

export async function syncProfilePatchMobile(
  patch: Partial<ProfilePrefs>,
): Promise<void> {
  const api = getAuthedApi();
  if (!api) return;

  try {
    const current = await api.fetchProfile();
    const body: UpdateProfileInput = { expectedVersion: current.version };
    if (patch.calendarSystem !== undefined) {
      body.calendarPreference =
        patch.calendarSystem === "julian" ? "old-calendar" : "new-calendar";
    }
    if (patch.patronSaintSlug !== undefined) {
      body.patronSaintSlug = patch.patronSaintSlug || null;
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
    await api.patchProfile(body);
  } catch (err) {
    console.warn("[mobile sync] profile patch failed", err);
  }
}

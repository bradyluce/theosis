"use client";

// Hydrate-on-load + claim-on-signup. Called by SyncProvider whenever the
// auth state transitions to "signed in." On first run for a given Clerk
// user, packages up the local snapshot, POSTs to /api/me/import (which
// transactionally merges any anonymous data into the account), then
// replaces the local store with the server's authoritative snapshot.
// Subsequent runs just refresh (no import).

import type {
  ClientSnapshotDto,
  MeSnapshotDto,
} from "@theosis/core/api/me-dtos";

import { useStudyState } from "@/lib/user/use-study-state";
import { ensureAnonymousId } from "./anonymous-id";
import { getMeApi } from "./client";

// Read current Zustand state and shape it for /api/me/import. The current
// web store still uses the legacy field names (verseId / colorLabel /
// savedAt / etc.) — translate at the boundary so the server gets the
// unified shape it expects. Once Phase 3 prep migrates the store to the
// canonical shape, this translator collapses to a pass-through.
function buildClientSnapshot(): ClientSnapshotDto {
  const s = useStudyState.getState();
  const prefs = s.preferences;

  // Strip "translation:" prefix to get a translation-agnostic verseKey.
  const stripTranslation = (verseId: string): string => {
    const colon = verseId.indexOf(":");
    return colon >= 0 ? verseId.slice(colon + 1) : verseId;
  };

  // Migrate legacy 3-color palette → 5-color slug set.
  const remapColor = (
    legacy: "gold" | "sand" | "linen",
  ): "gold" | "rose" | "sky" | "sage" | "lavender" => {
    if (legacy === "sand") return "sky";
    if (legacy === "linen") return "sage";
    return legacy;
  };

  return {
    preferences: {
      // Legacy fields → unified shape. Anything we don't have locally
      // (status, jurisdiction, etc.) gets left undefined so the server
      // keeps its current value.
      calendarPreference: prefs.calendarPreference,
      primaryTranslationId: prefs.primaryTranslationId,
      patronSaintSlug: prefs.patronSaintPersonId || null,
      preferredFatherIds: prefs.preferredFatherIds ?? [],
      hiddenFatherIds: prefs.hiddenFatherIds ?? [],
      location: prefs.location ?? null,
    },
    savedVerses: s.savedVerses.map((v) => ({
      clientId: v.id,
      verseKey: stripTranslation(v.verseId),
      translationId: v.translationId,
    })),
    highlights: s.highlights.map((h) => ({
      clientId: h.id,
      targetType: h.targetType,
      targetId: h.targetId,
      color: remapColor(h.colorLabel),
      excerpt: h.excerpt,
    })),
    notes: s.notes.map((n) => ({
      clientId: n.id,
      targetType: n.targetType,
      targetId: n.targetId,
      title: n.title,
      body: n.body,
    })),
    favoritePeople: s.favoritePeople.map((f) => ({
      clientId: f.id,
      personId: f.personId,
    })),
    readingList: (s.readingList ?? []).map((r) => ({
      clientId: r.id,
      workId: r.workId,
      status: r.status,
    })),
    recentSearches: s.recentSearches.map((q) => ({
      clientId: q.id,
      query: q.query,
    })),
    readingHistory: s.readingHistory.map((h) => ({
      clientId: h.id,
      href: h.href,
      label: h.label,
    })),
    // Legacy web shape has none of these; ship empty.
    prayerRule: { morning: [], evening: [] },
    activityDays: [],
    completions: [],
  };
}

// Replace the local store with the authoritative server snapshot. Translates
// the unified server shape back into the legacy web slot names that the rest
// of the app still reads from. Phase 3 prep collapses this into a direct copy.
function adoptServerSnapshot(snapshot: MeSnapshotDto): void {
  const p = snapshot.profile;

  useStudyState.setState((state) => ({
    ...state,
    auth: {
      ...state.auth,
      dbUserId: state.auth.dbUserId, // set by SyncProvider before this runs
      hydrationError: null,
    },
    preferences: {
      ...state.preferences,
      calendarPreference: p.calendarPreference,
      primaryTranslationId: p.primaryTranslationId,
      patronSaintPersonId: p.patronSaintSlug ?? "",
      preferredFatherIds: p.preferredFatherIds,
      hiddenFatherIds: p.hiddenFatherIds,
      location: p.location ?? undefined,
    },
    savedVerses: snapshot.savedVerses.map((v) => ({
      id: v.clientId,
      verseId: `${v.translationId}:${v.verseKey}`,
      translationId: v.translationId,
      savedAt: v.createdAt,
    })),
    highlights: snapshot.highlights.map((h) => ({
      id: h.clientId,
      targetType: h.targetType,
      targetId: h.targetId,
      // Legacy web type only knows gold/sand/linen — narrow down for now.
      // Phase 3 prep upgrades the local type to the full 5-color set.
      colorLabel:
        h.color === "rose" || h.color === "sky" || h.color === "sage" || h.color === "lavender"
          ? "gold"
          : h.color,
      excerpt: h.excerpt ?? "",
      createdAt: h.createdAt,
    })),
    notes: snapshot.notes.map((n) => ({
      id: n.clientId,
      targetType: n.targetType,
      targetId: n.targetId,
      title: n.title,
      body: n.body,
      updatedAt: n.updatedAt,
    })),
    favoritePeople: snapshot.favoritePeople.map((f) => ({
      id: f.clientId,
      personId: f.personId,
      addedAt: f.createdAt,
    })),
    readingList: snapshot.readingList.map((r) => ({
      id: r.clientId,
      workId: r.workId,
      status: r.status,
      addedAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
    recentSearches: snapshot.recentSearches.map((q) => ({
      id: q.clientId,
      query: q.query,
      savedAt: q.createdAt,
    })),
    readingHistory: snapshot.readingHistory.map((h) => ({
      id: h.clientId,
      label: h.label,
      href: h.href,
      visitedAt: h.createdAt,
    })),
  }));
}

// Idempotent. Called by SyncProvider on every isSignedIn → true transition.
// Sets isHydrating, runs claim-if-needed + hydrate, clears isHydrating.
export async function hydrateAndClaim(opts: {
  clerkUserId: string;
  hasLocalData: boolean;
}): Promise<void> {
  const api = getMeApi();
  const { clerkUserId, hasLocalData } = opts;

  useStudyState.setState((s) => ({
    auth: { ...s.auth, clerkUserId, isHydrating: true, hydrationError: null },
  }));

  try {
    let snapshot: MeSnapshotDto;
    const alreadyClaimed =
      typeof window !== "undefined" &&
      window.localStorage.getItem(`theosis.claimed.${clerkUserId}`) === "1";

    if (!alreadyClaimed && hasLocalData) {
      // First time this user signs in on this device with local data.
      useStudyState.setState((s) => ({
        auth: { ...s.auth, migrationStatus: "pending" },
      }));
      const anonymousId = ensureAnonymousId();
      try {
        snapshot = await api.postImport({
          anonymousId,
          snapshot: buildClientSnapshot(),
        });
        if (typeof window !== "undefined") {
          window.localStorage.setItem(`theosis.claimed.${clerkUserId}`, "1");
        }
        useStudyState.setState((s) => ({
          auth: { ...s.auth, migrationStatus: "complete" },
        }));
      } catch (err) {
        const status =
          err && typeof err === "object" && "status" in err
            ? (err as { status: number }).status
            : 0;
        if (status === 409) {
          // Different device already claimed. Bail out of the import; just
          // fetch the server snapshot and accept it. Local-only mutations
          // since sign-in are lost; that's an explicit Phase 1 tradeoff.
          snapshot = await api.fetchSnapshot();
          useStudyState.setState((s) => ({
            auth: {
              ...s.auth,
              migrationStatus: "complete",
              migrationError: "already_imported_on_another_device",
            },
          }));
        } else {
          throw err;
        }
      }
    } else {
      // Subsequent sign-in or fresh user with no local data — just hydrate.
      snapshot = await api.fetchSnapshot();
    }

    adoptServerSnapshot(snapshot);
  } catch (err) {
    console.error("[sync] hydrate failed", err);
    useStudyState.setState((s) => ({
      auth: {
        ...s.auth,
        hydrationError: err instanceof Error ? err.message : String(err),
      },
    }));
  } finally {
    useStudyState.setState((s) => ({
      auth: { ...s.auth, isHydrating: false },
    }));
  }
}

// Heuristic for "does this device have anonymous local data worth claiming?"
// Used by SyncProvider to skip the import on fresh devices (where it would
// be a no-op and a wasted HTTP round-trip).
export function hasLocalUserData(): boolean {
  const s = useStudyState.getState();
  return (
    s.savedVerses.length > 0 ||
    s.highlights.length > 0 ||
    s.notes.length > 0 ||
    s.favoritePeople.length > 0 ||
    (s.readingList ?? []).length > 0 ||
    s.recentSearches.length > 0 ||
    s.readingHistory.length > 0 ||
    !!s.preferences.patronSaintPersonId ||
    (s.preferences.preferredFatherIds?.length ?? 0) > 0 ||
    (s.preferences.hiddenFatherIds?.length ?? 0) > 0 ||
    !!s.preferences.location
  );
}

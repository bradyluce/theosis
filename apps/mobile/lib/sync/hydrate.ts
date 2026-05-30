// Hydrate-on-load + claim-on-signup for mobile. Mirrors web's
// src/lib/sync/hydrate.ts but adapts to the AsyncStorage-backed
// preferences module instead of a Zustand store.
//
// On first sign-in for a given Clerk user on this device:
//   1. Read local snapshot from preferences.ts
//   2. POST /api/me/import with anonymousId + snapshot
//   3. On success → adopt server snapshot into preferences.ts; mark claimed
//   4. On 409 (different device already claimed) → just GET /api/me
// Subsequent sign-ins: just GET /api/me to refresh.

import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  ClientSnapshotDto,
  MeSnapshotDto,
} from "@theosis/core/api/me-dtos";

import { getAuthedApi } from "@/lib/auth";
import {
  type AppPreferences,
  type DailyCardKey,
  type ProfilePrefs,
} from "@/lib/preferences";

import { ensureAnonymousId } from "./anonymous-id";

const PREFS_KEY = "theosis.prefs.v1";

// ---------------------------------------------------------------------------
// Helpers: read / write the whole prefs blob directly (preferences.ts has
// internal helpers but doesn't export them).
// ---------------------------------------------------------------------------

async function readPrefs(): Promise<AppPreferences> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as AppPreferences;
  } catch {
    return {};
  }
}

async function writePrefs(prefs: AppPreferences): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* swallow */
  }
}

// ---------------------------------------------------------------------------
// Local snapshot → ClientSnapshotDto
// ---------------------------------------------------------------------------

function highlightColorToUnified(
  color: "gold" | "rose" | "sky" | "sage" | "lavender",
): "gold" | "rose" | "sky" | "sage" | "lavender" {
  // Already the unified palette; pass through.
  return color;
}

function buildClientSnapshot(prefs: AppPreferences): ClientSnapshotDto {
  const p = prefs.profile ?? {};
  return {
    preferences: {
      // Map mobile field names → unified shape. The unified server schema
      // uses calendarPreference "new-calendar" | "old-calendar"; mobile uses
      // "new" | "julian". Translate.
      calendarPreference:
        p.calendarSystem === "julian" ? "old-calendar" : "new-calendar",
      patronSaintSlug: p.patronSaintSlug ?? null,
      birthday: p.birthday ?? null,
      // Every preference the user can set during onboarding or in
      // Settings ships here so the server has the truth on first
      // import. Omitting any of these means the user fills it in,
      // signs up, and watches it vanish on the next device.
      primaryTranslationId: p.primaryTranslationId ?? undefined,
      textSize: p.textSize ?? undefined,
      jurisdiction: p.jurisdiction ?? null,
      fastingLevel: p.fastingLevel ?? undefined,
      preferredFatherIds: p.commentaryFathers?.orderedSlugs ?? undefined,
      hiddenFatherIds: p.commentaryFathers?.hiddenSlugs ?? undefined,
      location: undefined,
      status: (p.status === "christian"
        ? "orthodox"
        : p.status === "catechumen"
          ? "catechumen"
          : p.status === "inquirer"
            ? "inquirer"
            : null) as ClientSnapshotDto["preferences"]["status"],
      parish: p.parish ?? null,
      commentaryRanking: p.commentaryRanking ?? undefined,
      dailyCardOrder: prefs.dailyCardOrder ?? undefined,
    },
    savedVerses: (prefs.savedVerses ?? []).map((v) => ({
      clientId: v.id,
      verseKey: `${v.book}.${v.chapter}.${v.verse}`,
      translationId: v.translation,
    })),
    highlights: (prefs.highlights ?? []).map((h) => ({
      clientId: `highlight-verse-${h.verseKey}`,
      targetType: "verse" as const,
      targetId: h.verseKey,
      color: highlightColorToUnified(h.color),
      excerpt: undefined,
    })),
    notes: (prefs.notes ?? []).map((n) => ({
      clientId: n.id,
      targetType: n.targetType,
      targetId: n.targetId,
      title: n.title,
      body: n.body,
    })),
    favoritePeople: (p.favoritePersonSlugs ?? []).map((slug) => ({
      clientId: `favorite-${slug}`,
      personId: slug,
    })),
    readingList: (prefs.readingList ?? []).map((r) => ({
      clientId: r.id,
      workId: r.workSlug,
      status: "read-later" as const,
    })),
    recentSearches: (prefs.recentSearches ?? []).map((query) => ({
      clientId: `search-${query.toLowerCase().replace(/\s+/g, "-")}`,
      query,
    })),
    readingHistory: [], // mobile has no reading-history store
    prayerRule: {
      morning: prefs.prayerRule?.morning ?? [],
      evening: prefs.prayerRule?.evening ?? [],
    },
    activityDays: prefs.activityDays ?? [],
    completions: (prefs.completions ?? []).map((c) => ({
      kind: c.kind,
      slug: c.slug,
    })),
  };
}

// ---------------------------------------------------------------------------
// Adopt server snapshot back into mobile prefs
// ---------------------------------------------------------------------------

async function adoptServerSnapshot(snapshot: MeSnapshotDto): Promise<void> {
  const current = await readPrefs();
  const p = snapshot.profile;

  const nextProfile: ProfilePrefs = {
    ...(current.profile ?? {}),
    patronSaintSlug: p.patronSaintSlug ?? undefined,
    birthday: p.birthday ?? undefined,
    calendarSystem: p.calendarPreference === "old-calendar" ? "julian" : "new",
    parish: p.parish ?? undefined,
    status:
      p.status === "orthodox"
        ? "christian"
        : p.status === "catechumen"
          ? "catechumen"
          : p.status === "inquirer"
            ? "inquirer"
            : undefined,
    commentaryRanking:
      p.commentaryRanking === "balanced" ||
      p.commentaryRanking === "ancient-first" ||
      p.commentaryRanking === "modern-first"
        ? p.commentaryRanking
        : undefined,
  };

  const next: AppPreferences = {
    ...current,
    profile: nextProfile,
    // Unify verseKey "book.chapter.verse" back into discrete fields.
    // We validate the split because a malformed verseKey (legacy row,
    // bad migration) would otherwise yield chapter: NaN / verse: NaN
    // and corrupt the local list silently. Drop the row instead.
    savedVerses: snapshot.savedVerses.flatMap((v) => {
      const parts = v.verseKey.split(".");
      if (parts.length !== 3) {
        console.warn(
          "[mobile sync] dropping savedVerse with malformed verseKey:",
          v.verseKey,
        );
        return [];
      }
      const [book, chapterStr, verseStr] = parts;
      const chapter = Number(chapterStr);
      const verse = Number(verseStr);
      if (!book || !Number.isFinite(chapter) || !Number.isFinite(verse)) {
        console.warn(
          "[mobile sync] dropping savedVerse with invalid parts:",
          v.verseKey,
        );
        return [];
      }
      return [
        {
          id: v.clientId,
          translation: v.translationId,
          book,
          chapter,
          verse,
          savedAt: v.createdAt,
        },
      ];
    }),
    highlights: snapshot.highlights
      .filter((h) => h.targetType === "verse")
      .map((h) => ({
        verseKey: h.targetId,
        color: h.color,
        createdAt: h.createdAt,
      })),
    notes: snapshot.notes.map((n) => ({
      id: n.clientId,
      targetType: n.targetType,
      targetId: n.targetId,
      title: n.title,
      body: n.body,
      version: n.version,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
    })),
    readingList: snapshot.readingList.map((r) => ({
      id: r.clientId,
      workSlug: r.workId,
      title: r.workId, // server doesn't store the title; fall back to slug
      addedAt: r.createdAt,
    })),
    recentSearches: snapshot.recentSearches.map((q) => q.query),
    activityDays: snapshot.activityDays,
    prayerRule: {
      morning: snapshot.prayerRule.morning.map((i) => i.itemId),
      evening: snapshot.prayerRule.evening.map((i) => i.itemId),
      initialized: snapshot.prayerRule.morning.length > 0 || snapshot.prayerRule.evening.length > 0,
    },
    dailyCardOrder: (p.dailyCardOrder as DailyCardKey[] | undefined) ?? current.dailyCardOrder,
  };

  // Cross-device onboarding flag: if the server snapshot carries a real
  // profile (status / patron / parish / jurisdiction set), the user
  // already completed onboarding on another device. Mark it locally so
  // the OnboardingRedirect guard at app/_layout.tsx doesn't push them
  // back through the 10-step flow on first install of mobile after
  // signing up on web (or vice versa). Only set "complete" — never
  // overwrite an existing local value, in case the user explicitly hit
  // "Restart setup" in Settings before the hydrate ran.
  const serverHasProfile = Boolean(
    nextProfile.status ||
      nextProfile.patronSaintSlug ||
      nextProfile.parish ||
      nextProfile.jurisdiction,
  );
  if (serverHasProfile && !current.onboardingStatus) {
    next.onboardingStatus = "complete";
  }

  await writePrefs(next);
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

const CLAIMED_KEY = (clerkUserId: string) =>
  `theosis.claimed.${clerkUserId}.v1`;

export async function hydrateAndClaim(opts: {
  clerkUserId: string;
}): Promise<void> {
  const api = getAuthedApi();
  if (!api) return;

  let alreadyClaimed = false;
  try {
    alreadyClaimed =
      (await AsyncStorage.getItem(CLAIMED_KEY(opts.clerkUserId))) === "1";
  } catch {
    /* ignore */
  }

  const prefs = await readPrefs();
  const hasLocal =
    (prefs.savedVerses ?? []).length > 0 ||
    (prefs.highlights ?? []).length > 0 ||
    (prefs.readingList ?? []).length > 0 ||
    (prefs.recentSearches ?? []).length > 0 ||
    !!prefs.profile?.patronSaintSlug ||
    !!prefs.profile?.parish ||
    !!prefs.profile?.status ||
    (prefs.activityDays ?? []).length > 0;

  let snapshot: MeSnapshotDto;
  if (!alreadyClaimed && hasLocal) {
    try {
      const anonymousId = await ensureAnonymousId();
      snapshot = await api.postImport({
        anonymousId,
        snapshot: buildClientSnapshot(prefs),
      });
      await AsyncStorage.setItem(CLAIMED_KEY(opts.clerkUserId), "1");
    } catch (err) {
      const status =
        err && typeof err === "object" && "status" in err
          ? (err as { status: number }).status
          : 0;
      if (status === 409) {
        // Another device already imported. Just fetch and accept divergence.
        snapshot = await api.fetchSnapshot();
        try {
          await AsyncStorage.setItem(CLAIMED_KEY(opts.clerkUserId), "1");
        } catch {
          /* ignore */
        }
      } else {
        console.error("[mobile sync] claim failed", err);
        return;
      }
    }
  } else {
    try {
      snapshot = await api.fetchSnapshot();
    } catch (err) {
      console.error("[mobile sync] hydrate fetch failed", err);
      return;
    }
  }

  await adoptServerSnapshot(snapshot);
}

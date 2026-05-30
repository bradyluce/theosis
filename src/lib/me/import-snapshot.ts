import "server-only";

// Transactional "claim" logic for POST /api/me/import. The client packages
// its anonymous local state into a ClientSnapshotDto and posts it with a
// device-stable `anonymousId`. The server merges it into the authed user's
// row by:
//   1. Rejecting if a different anonymousId already claimed this account
//      (unless ?merge=true is set — see route handler).
//   2. Setting `users.imported_from_anonymous_id` so future re-imports
//      from the same device are idempotent.
//   3. Inserting every entity with ON CONFLICT DO NOTHING — server-side
//      wins on natural-key collisions. This is the conservative path: an
//      existing server row is never overwritten by a less-recent local
//      one. The only "blend" is on profile preferences: missing server
//      fields fall back to whatever the client provided.

import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  activityDays,
  contentCompletions,
  favoritePeople,
  highlights,
  notes,
  prayerRuleItems,
  readingHistory,
  readingList,
  recentSearches,
  savedVerses,
  userProfiles,
  users,
} from "@theosis/core/db/schema";
import type { ClientSnapshotDto } from "@theosis/core/api/me-dtos";

export type ImportResult = {
  ok: true;
};

export type ImportRejection = {
  ok: false;
  code: "already_imported";
};

export async function importSnapshot(opts: {
  dbUserId: string;
  anonymousId: string;
  snapshot: ClientSnapshotDto;
  merge: boolean;
}): Promise<ImportResult | ImportRejection> {
  const { dbUserId, anonymousId, snapshot, merge } = opts;

  return await db.transaction(async (tx) => {
    const userRow = await tx.query.users.findFirst({
      where: eq(users.id, dbUserId),
    });
    if (!userRow) {
      throw new Error(`importSnapshot: missing user row ${dbUserId}`);
    }

    if (
      userRow.importedFromAnonymousId &&
      userRow.importedFromAnonymousId !== anonymousId &&
      !merge
    ) {
      return { ok: false, code: "already_imported" } as const;
    }

    if (!userRow.importedFromAnonymousId) {
      await tx
        .update(users)
        .set({ importedFromAnonymousId: anonymousId, updatedAt: new Date() })
        .where(eq(users.id, dbUserId));
    }

    // --- Profile preferences ---------------------------------------------
    // Blend the partial client preferences into the existing row. Any field
    // the client didn't send keeps the server's current value. Version is
    // bumped on every successful import so subsequent PATCHes won't 409.
    const existingProfile = await tx.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, dbUserId),
    });
    if (existingProfile) {
      const p = snapshot.preferences;
      const updates: Record<string, unknown> = {
        updatedAt: new Date(),
        version: existingProfile.version + 1,
      };
      if (p.calendarPreference !== undefined)
        updates.calendarPreference = p.calendarPreference;
      if (p.primaryTranslationId !== undefined)
        updates.primaryTranslationId = p.primaryTranslationId;
      if (p.textSize !== undefined) updates.textSize = p.textSize;
      if (p.status !== undefined) updates.status = p.status;
      if (p.jurisdiction !== undefined) updates.jurisdiction = p.jurisdiction;
      if (p.parish !== undefined) updates.parish = p.parish;
      if (p.parishId !== undefined) updates.parishId = p.parishId;
      if (p.location !== undefined) updates.location = p.location;
      if (p.birthday !== undefined) updates.birthday = p.birthday;
      if (p.patronSaintSlug !== undefined)
        updates.patronSaintSlug = p.patronSaintSlug;
      if (p.preferredFatherIds !== undefined)
        updates.preferredFatherIds = p.preferredFatherIds;
      if (p.hiddenFatherIds !== undefined)
        updates.hiddenFatherIds = p.hiddenFatherIds;
      if (p.commentaryRanking !== undefined)
        updates.commentaryRanking = p.commentaryRanking;
      if (p.fastingLevel !== undefined) updates.fastingLevel = p.fastingLevel;
      if (p.dailyCardOrder !== undefined)
        updates.dailyCardOrder = p.dailyCardOrder;

      await tx
        .update(userProfiles)
        .set(updates)
        .where(eq(userProfiles.userId, dbUserId));
    }

    // --- Per-entity bulk inserts ----------------------------------------
    // Every collection uses ON CONFLICT DO NOTHING on its natural unique
    // key so re-imports + concurrent same-user writes are safe.

    if (snapshot.savedVerses.length > 0) {
      await tx
        .insert(savedVerses)
        .values(
          snapshot.savedVerses.map((v) => ({
            userId: dbUserId,
            clientId: v.clientId,
            verseKey: v.verseKey,
            translationId: v.translationId,
          })),
        )
        .onConflictDoNothing({
          target: [savedVerses.userId, savedVerses.verseKey],
        });
    }

    if (snapshot.highlights.length > 0) {
      await tx
        .insert(highlights)
        .values(
          snapshot.highlights.map((h) => ({
            userId: dbUserId,
            clientId: h.clientId,
            targetType: h.targetType,
            targetId: h.targetId,
            color: h.color,
            excerpt: h.excerpt ?? null,
          })),
        )
        .onConflictDoNothing({
          target: [highlights.userId, highlights.targetType, highlights.targetId],
        });
    }

    if (snapshot.notes.length > 0) {
      await tx
        .insert(notes)
        .values(
          snapshot.notes.map((n) => ({
            userId: dbUserId,
            clientId: n.clientId,
            targetType: n.targetType,
            targetId: n.targetId,
            title: n.title,
            body: n.body,
          })),
        )
        .onConflictDoNothing();
    }

    if (snapshot.favoritePeople.length > 0) {
      await tx
        .insert(favoritePeople)
        .values(
          snapshot.favoritePeople.map((f) => ({
            userId: dbUserId,
            clientId: f.clientId,
            personId: f.personId,
          })),
        )
        .onConflictDoNothing({
          target: [favoritePeople.userId, favoritePeople.personId],
        });
    }

    if (snapshot.readingList.length > 0) {
      await tx
        .insert(readingList)
        .values(
          snapshot.readingList.map((r) => ({
            userId: dbUserId,
            clientId: r.clientId,
            workId: r.workId,
            status: r.status,
            positionChapterOrder: r.positionChapterOrder ?? null,
          })),
        )
        .onConflictDoNothing({
          target: [readingList.userId, readingList.workId],
        });
    }

    if (snapshot.recentSearches.length > 0) {
      // Recent searches use a (userId, lower(query)) functional unique
      // index — Drizzle's onConflict target shortcut doesn't model that
      // cleanly, so we fall back to bulk insert + best-effort dedupe via
      // ON CONFLICT DO NOTHING on the underlying constraint.
      for (const s of snapshot.recentSearches) {
        await tx
          .insert(recentSearches)
          .values({
            userId: dbUserId,
            clientId: s.clientId,
            query: s.query,
          })
          .onConflictDoNothing();
      }
    }

    if (snapshot.readingHistory.length > 0) {
      await tx
        .insert(readingHistory)
        .values(
          snapshot.readingHistory.map((h) => ({
            userId: dbUserId,
            clientId: h.clientId,
            href: h.href,
            label: h.label,
          })),
        )
        .onConflictDoNothing({
          target: [readingHistory.userId, readingHistory.href],
        });
    }

    // Prayer rule: replace-all on import. The client's local rule wins
    // because the server has no rule yet for fresh accounts; for re-imports
    // we still replace, since the user explicitly chose to claim.
    if (snapshot.prayerRule.morning.length > 0 || snapshot.prayerRule.evening.length > 0) {
      await tx
        .delete(prayerRuleItems)
        .where(eq(prayerRuleItems.userId, dbUserId));
      const values = [
        ...snapshot.prayerRule.morning.map((itemId, idx) => ({
          userId: dbUserId,
          clientId: `prayer-morning-${idx}-${itemId}`,
          slot: "morning" as const,
          itemId,
          position: idx + 1,
        })),
        ...snapshot.prayerRule.evening.map((itemId, idx) => ({
          userId: dbUserId,
          clientId: `prayer-evening-${idx}-${itemId}`,
          slot: "evening" as const,
          itemId,
          position: idx + 1,
        })),
      ];
      if (values.length > 0) {
        await tx.insert(prayerRuleItems).values(values);
      }
    }

    if (snapshot.activityDays.length > 0) {
      await tx
        .insert(activityDays)
        .values(
          snapshot.activityDays.map((day) => ({
            userId: dbUserId,
            day,
          })),
        )
        .onConflictDoNothing({
          target: [activityDays.userId, activityDays.day],
        });
    }

    if (snapshot.completions.length > 0) {
      await tx
        .insert(contentCompletions)
        .values(
          snapshot.completions.map((c) => ({
            userId: dbUserId,
            kind: c.kind,
            slug: c.slug,
          })),
        )
        .onConflictDoNothing({
          target: [
            contentCompletions.userId,
            contentCompletions.kind,
            contentCompletions.slug,
          ],
        });
    }

    return { ok: true } as const;
  });
}


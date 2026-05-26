import "server-only";

import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import {
  ConflictError,
  readJson,
  withUser,
  withUserResponse,
} from "@/lib/me/route-helpers";
import { db } from "@/lib/db";
import { updateProfileInput } from "@theosis/core/api/me-dtos";
import { userProfiles, type DbUserProfile } from "@theosis/core/db/schema";

function rowToDto(row: DbUserProfile) {
  return {
    calendarPreference: row.calendarPreference,
    primaryTranslationId: row.primaryTranslationId,
    textSize: row.textSize,
    status: row.status,
    jurisdiction: row.jurisdiction,
    parish: row.parish,
    parishId: row.parishId,
    location: row.location,
    patronSaintSlug: row.patronSaintSlug,
    preferredFatherIds: row.preferredFatherIds,
    hiddenFatherIds: row.hiddenFatherIds,
    commentaryRanking: row.commentaryRanking,
    fastingLevel: row.fastingLevel,
    dailyCardOrder: row.dailyCardOrder,
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const GET = withUser(async (dbUser) => {
  const row = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, dbUser.id),
  });
  if (!row) {
    throw new Error("profile_not_found"); // resolveDbUser should have inserted one
  }
  return rowToDto(row);
});

// PATCH semantics: optimistic concurrency via expectedVersion. Client sends
// the version it last fetched; server rejects with 409 on mismatch and
// returns the current row so the UI can prompt "your preferences were
// changed on another device" if needed.
export const PATCH = withUserResponse(async (dbUser, req) => {
  const input = await readJson(req, updateProfileInput);

  return await db.transaction(async (tx) => {
    const existing = await tx.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, dbUser.id),
    });
    if (!existing) {
      throw new Error("profile_not_found");
    }

    if (existing.version !== input.expectedVersion) {
      throw new ConflictError("version_mismatch", rowToDto(existing));
    }

    const now = new Date();
    const updates: Partial<DbUserProfile> = {
      updatedAt: now,
      version: existing.version + 1,
    };
    // Only copy fields the client explicitly sent. Everything else stays.
    if (input.calendarPreference !== undefined)
      updates.calendarPreference = input.calendarPreference;
    if (input.primaryTranslationId !== undefined)
      updates.primaryTranslationId = input.primaryTranslationId;
    if (input.textSize !== undefined) updates.textSize = input.textSize;
    if (input.status !== undefined) updates.status = input.status;
    if (input.jurisdiction !== undefined)
      updates.jurisdiction = input.jurisdiction;
    if (input.parish !== undefined) updates.parish = input.parish;
    if (input.parishId !== undefined) updates.parishId = input.parishId;
    if (input.location !== undefined) updates.location = input.location;
    if (input.patronSaintSlug !== undefined)
      updates.patronSaintSlug = input.patronSaintSlug;
    if (input.preferredFatherIds !== undefined)
      updates.preferredFatherIds = input.preferredFatherIds;
    if (input.hiddenFatherIds !== undefined)
      updates.hiddenFatherIds = input.hiddenFatherIds;
    if (input.commentaryRanking !== undefined)
      updates.commentaryRanking = input.commentaryRanking;
    if (input.fastingLevel !== undefined)
      updates.fastingLevel = input.fastingLevel;
    if (input.dailyCardOrder !== undefined)
      updates.dailyCardOrder = input.dailyCardOrder;

    const [row] = await tx
      .update(userProfiles)
      .set(updates)
      .where(
        and(
          eq(userProfiles.userId, dbUser.id),
          eq(userProfiles.version, existing.version),
        ),
      )
      .returning();
    return NextResponse.json({ data: rowToDto(row) });
  });
});

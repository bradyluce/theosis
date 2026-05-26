import "server-only";

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db";
import { userProfiles } from "@theosis/core/db/schema";

// GET /api/me/profile — just the preferences row. Useful when a client
// only needs to render preference UI and doesn't want the full snapshot
// payload. PATCH lands in commit 3.

export async function GET() {
  const result = await requireUser();
  if (result.error) return result.error;

  const row = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, result.dbUser.id),
  });
  if (!row) {
    return NextResponse.json(
      { error: "profile_not_found" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    data: {
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
    },
  });
}

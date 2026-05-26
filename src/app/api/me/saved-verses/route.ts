import "server-only";

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { readJson, withUser, withUserResponse } from "@/lib/me/route-helpers";
import { createSavedVerseInput } from "@theosis/core/api/me-dtos";
import { savedVerses } from "@theosis/core/db/schema";

const ISO = (d: Date) => d.toISOString();

export const GET = withUser(async (dbUser) => {
  const rows = await db
    .select()
    .from(savedVerses)
    .where(eq(savedVerses.userId, dbUser.id));
  return rows.map((r) => ({
    id: r.id,
    clientId: r.clientId,
    verseKey: r.verseKey,
    translationId: r.translationId,
    createdAt: ISO(r.createdAt),
    updatedAt: ISO(r.updatedAt),
  }));
});

// POST is idempotent on (userId, verseKey) — duplicate verse saves return
// the existing row instead of creating a second one.
export const POST = withUserResponse(async (dbUser, req) => {
  const input = await readJson(req, createSavedVerseInput);
  const [row] = await db
    .insert(savedVerses)
    .values({
      userId: dbUser.id,
      clientId: input.clientId,
      verseKey: input.verseKey,
      translationId: input.translationId,
    })
    .onConflictDoNothing({
      target: [savedVerses.userId, savedVerses.verseKey],
    })
    .returning();
  // If onConflict skipped, re-fetch the existing row.
  const final =
    row ??
    (await db.query.savedVerses.findFirst({
      where: (sv, { and, eq: e }) =>
        and(e(sv.userId, dbUser.id), e(sv.verseKey, input.verseKey)),
    }))!;
  return NextResponse.json(
    {
      data: {
        id: final.id,
        clientId: final.clientId,
        verseKey: final.verseKey,
        translationId: final.translationId,
        createdAt: ISO(final.createdAt),
        updatedAt: ISO(final.updatedAt),
      },
    },
    { status: row ? 201 : 200 },
  );
});

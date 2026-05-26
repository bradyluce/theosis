import "server-only";

import { desc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { readJson, withUser, withUserResponse } from "@/lib/me/route-helpers";
import { createReadingHistoryInput } from "@theosis/core/api/me-dtos";
import { readingHistory } from "@theosis/core/db/schema";

const ISO = (d: Date) => d.toISOString();
const KEEP = 10;

export const GET = withUser(async (dbUser) => {
  const rows = await db
    .select()
    .from(readingHistory)
    .where(eq(readingHistory.userId, dbUser.id))
    .orderBy(desc(readingHistory.updatedAt))
    .limit(KEEP);
  return rows.map((r) => ({
    id: r.id,
    clientId: r.clientId,
    href: r.href,
    label: r.label,
    createdAt: ISO(r.createdAt),
    updatedAt: ISO(r.updatedAt),
  }));
});

// POST: upsert on (userId, href). The same href visited again bumps
// updatedAt; the unique index keeps the table from growing unboundedly
// for repeat-visited pages.
export const POST = withUserResponse(async (dbUser, req) => {
  const input = await readJson(req, createReadingHistoryInput);
  const now = new Date();
  const [row] = await db
    .insert(readingHistory)
    .values({
      userId: dbUser.id,
      clientId: input.clientId,
      href: input.href,
      label: input.label,
    })
    .onConflictDoUpdate({
      target: [readingHistory.userId, readingHistory.href],
      set: { label: input.label, updatedAt: now },
    })
    .returning();

  // Trim beyond KEEP most-recent.
  await db.execute(sql`
    DELETE FROM ${readingHistory}
    WHERE id IN (
      SELECT id FROM ${readingHistory}
      WHERE user_id = ${dbUser.id}
      ORDER BY updated_at DESC
      OFFSET ${KEEP}
    )
  `);

  return NextResponse.json({
    data: {
      id: row.id,
      clientId: row.clientId,
      href: row.href,
      label: row.label,
      createdAt: ISO(row.createdAt),
      updatedAt: ISO(row.updatedAt),
    },
  });
});

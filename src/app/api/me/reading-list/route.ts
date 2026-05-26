import "server-only";

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { readJson, withUser, withUserResponse } from "@/lib/me/route-helpers";
import { upsertReadingListInput } from "@theosis/core/api/me-dtos";
import { readingList } from "@theosis/core/db/schema";

const ISO = (d: Date) => d.toISOString();

export const GET = withUser(async (dbUser) => {
  const rows = await db
    .select()
    .from(readingList)
    .where(eq(readingList.userId, dbUser.id));
  return rows.map((r) => ({
    id: r.id,
    clientId: r.clientId,
    workId: r.workId,
    status: r.status,
    positionChapterOrder: r.positionChapterOrder,
    createdAt: ISO(r.createdAt),
    updatedAt: ISO(r.updatedAt),
  }));
});

// PUT upserts on (userId, workId) — the same status mutation regardless of
// whether the user had this work in their list before.
export const PUT = withUserResponse(async (dbUser, req) => {
  const input = await readJson(req, upsertReadingListInput);
  const now = new Date();
  const [row] = await db
    .insert(readingList)
    .values({
      userId: dbUser.id,
      clientId: input.clientId,
      workId: input.workId,
      status: input.status,
      positionChapterOrder: input.positionChapterOrder ?? null,
    })
    .onConflictDoUpdate({
      target: [readingList.userId, readingList.workId],
      set: {
        status: input.status,
        positionChapterOrder: input.positionChapterOrder ?? null,
        updatedAt: now,
      },
    })
    .returning();
  return NextResponse.json({
    data: {
      id: row.id,
      clientId: row.clientId,
      workId: row.workId,
      status: row.status,
      positionChapterOrder: row.positionChapterOrder,
      createdAt: ISO(row.createdAt),
      updatedAt: ISO(row.updatedAt),
    },
  });
});

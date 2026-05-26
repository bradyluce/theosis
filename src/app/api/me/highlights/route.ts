import "server-only";

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { readJson, withUser, withUserResponse } from "@/lib/me/route-helpers";
import { upsertHighlightInput } from "@theosis/core/api/me-dtos";
import { highlights } from "@theosis/core/db/schema";

const ISO = (d: Date) => d.toISOString();

export const GET = withUser(async (dbUser) => {
  const rows = await db
    .select()
    .from(highlights)
    .where(eq(highlights.userId, dbUser.id));
  return rows.map((r) => ({
    id: r.id,
    clientId: r.clientId,
    targetType: r.targetType,
    targetId: r.targetId,
    color: r.color,
    excerpt: r.excerpt,
    createdAt: ISO(r.createdAt),
    updatedAt: ISO(r.updatedAt),
  }));
});

// PUT semantics: upsert on (userId, targetType, targetId). Used by both
// "highlight this verse for the first time" and "change my existing
// highlight to a different color" — the client doesn't have to know which.
export const PUT = withUserResponse(async (dbUser, req) => {
  const input = await readJson(req, upsertHighlightInput);
  const now = new Date();
  const [row] = await db
    .insert(highlights)
    .values({
      userId: dbUser.id,
      clientId: input.clientId,
      targetType: input.targetType,
      targetId: input.targetId,
      color: input.color,
      excerpt: input.excerpt ?? null,
    })
    .onConflictDoUpdate({
      target: [highlights.userId, highlights.targetType, highlights.targetId],
      set: {
        color: input.color,
        excerpt: input.excerpt ?? null,
        updatedAt: now,
      },
    })
    .returning();
  return NextResponse.json({
    data: {
      id: row.id,
      clientId: row.clientId,
      targetType: row.targetType,
      targetId: row.targetId,
      color: row.color,
      excerpt: row.excerpt,
      createdAt: ISO(row.createdAt),
      updatedAt: ISO(row.updatedAt),
    },
  });
});

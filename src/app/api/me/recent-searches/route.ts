import "server-only";

import { desc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { readJson, withUser, withUserResponse } from "@/lib/me/route-helpers";
import { createRecentSearchInput } from "@theosis/core/api/me-dtos";
import { recentSearches } from "@theosis/core/db/schema";

const ISO = (d: Date) => d.toISOString();
const KEEP = 8;

export const GET = withUser(async (dbUser) => {
  const rows = await db
    .select()
    .from(recentSearches)
    .where(eq(recentSearches.userId, dbUser.id))
    .orderBy(desc(recentSearches.updatedAt))
    .limit(KEEP);
  return rows.map((r) => ({
    id: r.id,
    clientId: r.clientId,
    query: r.query,
    createdAt: ISO(r.createdAt),
    updatedAt: ISO(r.updatedAt),
  }));
});

// POST: upsert on lowercased query (matches the client's dedup semantics)
// and trim to KEEP most-recent. The trim is best-effort per-write — the
// LIST endpoint applies the cap authoritatively via ORDER BY ... LIMIT.
//
// Drizzle's high-level onConflict builder doesn't accept functional-index
// targets, so we drop to raw SQL for the upsert. The (user_id, lower(query))
// unique index is named `recent_searches_user_query_uniq` and Postgres can
// match it by column tuple syntax.
export const POST = withUserResponse(async (dbUser, req) => {
  const input = await readJson(req, createRecentSearchInput);
  const inserted = await db.execute(sql`
    INSERT INTO recent_searches (user_id, client_id, query)
    VALUES (${dbUser.id}, ${input.clientId}, ${input.query})
    ON CONFLICT (user_id, lower(query))
    DO UPDATE SET query = EXCLUDED.query, updated_at = now()
    RETURNING id, client_id, query, created_at, updated_at
  `);
  const row = (inserted.rows ?? inserted)[0] as unknown as {
    id: string;
    client_id: string;
    query: string;
    created_at: Date;
    updated_at: Date;
  };

  // Trim oldest beyond KEEP for this user.
  await db.execute(sql`
    DELETE FROM recent_searches
    WHERE id IN (
      SELECT id FROM recent_searches
      WHERE user_id = ${dbUser.id}
      ORDER BY updated_at DESC
      OFFSET ${KEEP}
    )
  `);

  return NextResponse.json({
    data: {
      id: row.id,
      clientId: row.client_id,
      query: row.query,
      createdAt: ISO(new Date(row.created_at)),
      updatedAt: ISO(new Date(row.updated_at)),
    },
  });
});

// DELETE on the collection root clears all of this user's recent searches.
export const DELETE = withUserResponse(async (dbUser) => {
  await db
    .delete(recentSearches)
    .where(eq(recentSearches.userId, dbUser.id));
  return new NextResponse(null, { status: 204 });
});

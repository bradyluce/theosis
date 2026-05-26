import "server-only";

import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import {
  ConflictError,
  readJson,
  withUser,
  withUserResponse,
} from "@/lib/me/route-helpers";
import { upsertNoteInput } from "@theosis/core/api/me-dtos";
import { notes } from "@theosis/core/db/schema";

const ISO = (d: Date) => d.toISOString();

function noteRowToDto(row: typeof notes.$inferSelect) {
  return {
    id: row.id,
    clientId: row.clientId,
    targetType: row.targetType,
    targetId: row.targetId,
    title: row.title,
    body: row.body,
    version: row.version,
    createdAt: ISO(row.createdAt),
    updatedAt: ISO(row.updatedAt),
  };
}

export const GET = withUser(async (dbUser) => {
  const rows = await db
    .select()
    .from(notes)
    .where(and(eq(notes.userId, dbUser.id), isNull(notes.deletedAt)));
  return rows.map(noteRowToDto);
});

// PUT semantics: upsert with optimistic concurrency. Client sends
// `expectedVersion`. Server compares against the current row's version:
//  - 0 with no existing row → fresh insert (version becomes 1)
//  - matches existing row's version → update + bump version
//  - mismatch → 409 with the current row so the client can prompt the user
export const PUT = withUserResponse(async (dbUser, req) => {
  const input = await readJson(req, upsertNoteInput);

  return await db.transaction(async (tx) => {
    const existing = await tx.query.notes.findFirst({
      where: (n, { and: a, eq: e, isNull: nl }) =>
        a(
          e(n.userId, dbUser.id),
          e(n.targetType, input.targetType),
          e(n.targetId, input.targetId),
          nl(n.deletedAt),
        ),
    });

    if (!existing) {
      if (input.expectedVersion !== 0) {
        // Client thinks a note exists at this target but server doesn't —
        // probably a stale local state. Return 409 with no current row.
        throw new ConflictError("note_not_found_at_target", null);
      }
      const [row] = await tx
        .insert(notes)
        .values({
          userId: dbUser.id,
          clientId: input.clientId,
          targetType: input.targetType,
          targetId: input.targetId,
          title: input.title,
          body: input.body,
        })
        .returning();
      return NextResponse.json({ data: noteRowToDto(row) }, { status: 201 });
    }

    if (existing.version !== input.expectedVersion) {
      throw new ConflictError("version_mismatch", noteRowToDto(existing));
    }

    const now = new Date();
    const [row] = await tx
      .update(notes)
      .set({
        title: input.title,
        body: input.body,
        version: existing.version + 1,
        updatedAt: now,
      })
      .where(eq(notes.id, existing.id))
      .returning();
    return NextResponse.json({ data: noteRowToDto(row) });
  });
});

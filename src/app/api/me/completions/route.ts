import "server-only";

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { readJson, withUser, withUserResponse } from "@/lib/me/route-helpers";
import { createCompletionInput } from "@theosis/core/api/me-dtos";
import { contentCompletions } from "@theosis/core/db/schema";

const ISO = (d: Date) => d.toISOString();

export const GET = withUser(async (dbUser) => {
  const rows = await db
    .select()
    .from(contentCompletions)
    .where(eq(contentCompletions.userId, dbUser.id));
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    slug: r.slug,
    completedAt: ISO(r.completedAt),
  }));
});

export const POST = withUserResponse(async (dbUser, req) => {
  const input = await readJson(req, createCompletionInput);
  const [row] = await db
    .insert(contentCompletions)
    .values({
      userId: dbUser.id,
      kind: input.kind,
      slug: input.slug,
    })
    .onConflictDoNothing({
      target: [
        contentCompletions.userId,
        contentCompletions.kind,
        contentCompletions.slug,
      ],
    })
    .returning();
  const final =
    row ??
    (await db.query.contentCompletions.findFirst({
      where: (c, { and, eq: e }) =>
        and(
          e(c.userId, dbUser.id),
          e(c.kind, input.kind),
          e(c.slug, input.slug),
        ),
    }))!;
  return NextResponse.json(
    {
      data: {
        id: final.id,
        kind: final.kind,
        slug: final.slug,
        completedAt: ISO(final.completedAt),
      },
    },
    { status: row ? 201 : 200 },
  );
});

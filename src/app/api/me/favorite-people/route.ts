import "server-only";

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { readJson, withUser, withUserResponse } from "@/lib/me/route-helpers";
import { createFavoritePersonInput } from "@theosis/core/api/me-dtos";
import { favoritePeople } from "@theosis/core/db/schema";

const ISO = (d: Date) => d.toISOString();

export const GET = withUser(async (dbUser) => {
  const rows = await db
    .select()
    .from(favoritePeople)
    .where(eq(favoritePeople.userId, dbUser.id));
  return rows.map((r) => ({
    id: r.id,
    clientId: r.clientId,
    personId: r.personId,
    createdAt: ISO(r.createdAt),
    updatedAt: ISO(r.updatedAt),
  }));
});

export const POST = withUserResponse(async (dbUser, req) => {
  const input = await readJson(req, createFavoritePersonInput);
  const [row] = await db
    .insert(favoritePeople)
    .values({
      userId: dbUser.id,
      clientId: input.clientId,
      personId: input.personId,
    })
    .onConflictDoNothing({
      target: [favoritePeople.userId, favoritePeople.personId],
    })
    .returning();
  const final =
    row ??
    (await db.query.favoritePeople.findFirst({
      where: (fp, { and, eq: e }) =>
        and(e(fp.userId, dbUser.id), e(fp.personId, input.personId)),
    }))!;
  return NextResponse.json(
    {
      data: {
        id: final.id,
        clientId: final.clientId,
        personId: final.personId,
        createdAt: ISO(final.createdAt),
        updatedAt: ISO(final.updatedAt),
      },
    },
    { status: row ? 201 : 200 },
  );
});

import "server-only";

import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { withUserResponse } from "@/lib/me/route-helpers";
import { notes } from "@theosis/core/db/schema";

// Soft delete — sets deleted_at. The unique index on (userId, targetType,
// targetId) is filtered on deletedAt IS NULL, so the user can create a
// fresh note on the same target afterwards.
export const DELETE = withUserResponse(async (dbUser, req) => {
  const segments = req.nextUrl.pathname.split("/");
  const clientId = decodeURIComponent(segments[segments.length - 1]);
  await db
    .update(notes)
    .set({ deletedAt: new Date() })
    .where(and(eq(notes.userId, dbUser.id), eq(notes.clientId, clientId)));
  return new NextResponse(null, { status: 204 });
});

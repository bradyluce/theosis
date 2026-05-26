import "server-only";

import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { withUserResponse } from "@/lib/me/route-helpers";
import { highlights } from "@theosis/core/db/schema";

export const DELETE = withUserResponse(async (dbUser, req) => {
  const segments = req.nextUrl.pathname.split("/");
  const clientId = decodeURIComponent(segments[segments.length - 1]);
  await db
    .delete(highlights)
    .where(
      and(eq(highlights.userId, dbUser.id), eq(highlights.clientId, clientId)),
    );
  return new NextResponse(null, { status: 204 });
});

import "server-only";

import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { withUserResponse } from "@/lib/me/route-helpers";
import { savedVerses } from "@theosis/core/db/schema";

export const DELETE = withUserResponse(async (dbUser, req) => {
  // App Router 16 ships dynamic params as Promise on req.nextUrl... but the
  // simplest cross-version-safe pattern is to peel the segment off pathname.
  const segments = req.nextUrl.pathname.split("/");
  const clientId = decodeURIComponent(segments[segments.length - 1]);
  await db
    .delete(savedVerses)
    .where(
      and(eq(savedVerses.userId, dbUser.id), eq(savedVerses.clientId, clientId)),
    );
  return new NextResponse(null, { status: 204 });
});

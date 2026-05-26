import "server-only";

// requireUser() — called from any /api/me/** route handler. Returns either
// a 401 response (which the caller short-circuits with `return result.error`)
// or the resolved Postgres user row. Middleware in src/middleware.ts already
// rejects unauthenticated requests with a Clerk redirect; this is a defense-
// in-depth check + the place where the Clerk userId becomes a DB user uuid.

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { resolveDbUser, type DbUserRow } from "@/lib/auth/resolve-db-user";

export type RequireUserResult =
  | { error: NextResponse; dbUser?: undefined }
  | { error?: undefined; dbUser: DbUserRow };

export async function requireUser(): Promise<RequireUserResult> {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return {
      error: NextResponse.json(
        { error: "unauthenticated" },
        { status: 401 },
      ),
    };
  }
  const dbUser = await resolveDbUser(clerkUserId);
  return { dbUser };
}

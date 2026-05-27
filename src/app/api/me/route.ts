import "server-only";

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/require-user";
import { getSnapshot } from "@/lib/me/get-snapshot";
import { users } from "@theosis/core/db/schema";

// GET /api/me — full snapshot for the authenticated user. Used by clients
// on app start (and after sign-in) to hydrate their local caches.

export async function GET() {
  const result = await requireUser();
  if (result.error) return result.error;
  const snapshot = await getSnapshot(result.dbUser.id);
  return NextResponse.json({ data: snapshot });
}

// DELETE /api/me — full account deletion. Drops the user's row in the
// `users` table, which cascades through every onDelete:cascade FK in
// the schema (highlights, notes, saved verses, favorites, reading list,
// recent searches, reading history, prayer rule, activity days,
// completions, user profile). The Clerk-side user record is not
// touched here — the mobile client signs out via Clerk's SDK after a
// successful 200 from this route. Required by App Store guideline 4.1
// (in-app account deletion).
export async function DELETE() {
  const result = await requireUser();
  if (result.error) return result.error;
  try {
    await db.delete(users).where(eq(users.id, result.dbUser.id));
  } catch (err) {
    console.error("[/api/me DELETE] failed:", err);
    return NextResponse.json(
      { error: "delete_failed" },
      { status: 500 },
    );
  }
  return NextResponse.json({ data: { deleted: true } });
}

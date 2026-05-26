import "server-only";

import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/require-user";
import { getSnapshot } from "@/lib/me/get-snapshot";

// GET /api/me — full snapshot for the authenticated user. Used by clients
// on app start (and after sign-in) to hydrate their local caches.

export async function GET() {
  const result = await requireUser();
  if (result.error) return result.error;
  const snapshot = await getSnapshot(result.dbUser.id);
  return NextResponse.json({ data: snapshot });
}

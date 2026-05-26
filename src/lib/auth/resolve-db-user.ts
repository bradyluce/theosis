import "server-only";

// Lazy provisioning of the Postgres `users` row. The first authenticated
// request for a Clerk user creates the row; subsequent requests just look
// it up. We chose lazy over webhooks for Phase 1 because:
//   - No webhook endpoint to provision (one less moving part)
//   - Idempotent by construction (INSERT ... ON CONFLICT DO NOTHING)
//   - The first authed request always precedes any destructive action,
//     so by the time the user can do something with their account, the
//     row exists.
// Webhooks (for `user.deleted` cleanup) come later in Phase 3.

import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { users, userProfiles } from "@theosis/core/db/schema";

export type DbUserRow = typeof users.$inferSelect;

export async function resolveDbUser(clerkUserId: string): Promise<DbUserRow> {
  const existing = await db.query.users.findFirst({
    where: eq(users.clerkUserId, clerkUserId),
  });
  if (existing) return existing;

  // Two-row insert (user + their default profile) wrapped in a transaction so
  // we never end up with a user lacking a profile row. ON CONFLICT DO NOTHING
  // on both inserts handles the race where two concurrent requests provision
  // the same user — only one wins, the other re-fetches below.
  await db.transaction(async (tx) => {
    const [insertedUser] = await tx
      .insert(users)
      .values({ clerkUserId, onboardingStatus: "needs_onboarding" })
      .onConflictDoNothing({ target: users.clerkUserId })
      .returning({ id: users.id });

    if (insertedUser) {
      await tx
        .insert(userProfiles)
        .values({ userId: insertedUser.id })
        .onConflictDoNothing({ target: userProfiles.userId });
    }
  });

  // Re-fetch — handles both the happy path and the racy "another request
  // inserted first" path.
  const settled = await db.query.users.findFirst({
    where: eq(users.clerkUserId, clerkUserId),
  });
  if (!settled) {
    throw new Error(
      `resolveDbUser: failed to provision user for clerk id ${clerkUserId}`,
    );
  }
  return settled;
}

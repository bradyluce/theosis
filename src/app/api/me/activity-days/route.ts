import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { readJson, withUser } from "@/lib/me/route-helpers";
import { recordActivityDayInput } from "@theosis/core/api/me-dtos";
import { activityDays } from "@theosis/core/db/schema";

export const GET = withUser(async (dbUser) => {
  const rows = await db
    .select()
    .from(activityDays)
    .where(eq(activityDays.userId, dbUser.id));
  return rows.map((r) => r.day).sort();
});

export const POST = withUser(async (dbUser, req) => {
  const input = await readJson(req, recordActivityDayInput);
  await db
    .insert(activityDays)
    .values({ userId: dbUser.id, day: input.day })
    .onConflictDoNothing({
      target: [activityDays.userId, activityDays.day],
    });
  const rows = await db
    .select()
    .from(activityDays)
    .where(eq(activityDays.userId, dbUser.id));
  return rows.map((r) => r.day).sort();
});

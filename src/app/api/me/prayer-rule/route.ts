import "server-only";

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { readJson, withUser, withUserResponse } from "@/lib/me/route-helpers";
import { replacePrayerRuleInput } from "@theosis/core/api/me-dtos";
import { prayerRuleItems } from "@theosis/core/db/schema";

const ISO = (d: Date) => d.toISOString();

function rowToDto(row: typeof prayerRuleItems.$inferSelect) {
  return {
    id: row.id,
    clientId: row.clientId,
    slot: row.slot,
    itemId: row.itemId,
    position: row.position,
    createdAt: ISO(row.createdAt),
    updatedAt: ISO(row.updatedAt),
  };
}

export const GET = withUser(async (dbUser) => {
  const rows = await db
    .select()
    .from(prayerRuleItems)
    .where(eq(prayerRuleItems.userId, dbUser.id));
  const morning = rows
    .filter((r) => r.slot === "morning")
    .sort((a, b) => a.position - b.position)
    .map(rowToDto);
  const evening = rows
    .filter((r) => r.slot === "evening")
    .sort((a, b) => a.position - b.position)
    .map(rowToDto);
  return { morning, evening };
});

// PUT replaces the entire ordered rule. We could do per-item insert/
// delete/move endpoints, but replace-all matches how the editor UI
// actually works (drag-to-reorder commits the whole new order) and is
// idempotent — sync queue retries don't double-write items.
export const PUT = withUserResponse(async (dbUser, req) => {
  const input = await readJson(req, replacePrayerRuleInput);

  await db.transaction(async (tx) => {
    await tx
      .delete(prayerRuleItems)
      .where(eq(prayerRuleItems.userId, dbUser.id));
    const values = [
      ...input.morning.map((itemId, idx) => ({
        userId: dbUser.id,
        clientId: `prayer-morning-${idx}-${itemId}`,
        slot: "morning" as const,
        itemId,
        position: idx + 1,
      })),
      ...input.evening.map((itemId, idx) => ({
        userId: dbUser.id,
        clientId: `prayer-evening-${idx}-${itemId}`,
        slot: "evening" as const,
        itemId,
        position: idx + 1,
      })),
    ];
    if (values.length > 0) {
      await tx.insert(prayerRuleItems).values(values);
    }
  });

  const refreshed = await db
    .select()
    .from(prayerRuleItems)
    .where(eq(prayerRuleItems.userId, dbUser.id));
  return NextResponse.json({
    data: {
      morning: refreshed
        .filter((r) => r.slot === "morning")
        .sort((a, b) => a.position - b.position)
        .map(rowToDto),
      evening: refreshed
        .filter((r) => r.slot === "evening")
        .sort((a, b) => a.position - b.position)
        .map(rowToDto),
    },
  });
});

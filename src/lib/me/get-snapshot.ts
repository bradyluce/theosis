import "server-only";

// Loads the full MeSnapshotDto for a user via parallel SELECTs. The shape
// matches what /api/me returns (and what clients hydrate into their local
// caches).

import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  activityDays,
  contentCompletions,
  favoritePeople,
  highlights,
  notes,
  prayerRuleItems,
  readingHistory,
  readingList,
  recentSearches,
  savedVerses,
  userProfiles,
  users,
  type DbUserProfile,
} from "@theosis/core/db/schema";
import type { MeSnapshotDto } from "@theosis/core/api/me-dtos";

const ISO = (value: Date) => value.toISOString();

function profileRowToDto(
  row: DbUserProfile,
): MeSnapshotDto["profile"] {
  return {
    calendarPreference: row.calendarPreference,
    primaryTranslationId: row.primaryTranslationId,
    textSize: row.textSize,
    status: row.status,
    jurisdiction: row.jurisdiction,
    parish: row.parish,
    parishId: row.parishId,
    location: row.location,
    patronSaintSlug: row.patronSaintSlug,
    preferredFatherIds: row.preferredFatherIds,
    hiddenFatherIds: row.hiddenFatherIds,
    commentaryRanking: row.commentaryRanking,
    fastingLevel: row.fastingLevel,
    dailyCardOrder: row.dailyCardOrder,
    version: row.version,
    createdAt: ISO(row.createdAt),
    updatedAt: ISO(row.updatedAt),
  };
}

export async function getSnapshot(dbUserId: string): Promise<MeSnapshotDto> {
  const [
    profileRow,
    userRow,
    savedVerseRows,
    highlightRows,
    noteRows,
    favoriteRows,
    readingListRows,
    recentSearchRows,
    readingHistoryRows,
    prayerRuleRows,
    activityDayRows,
    completionRows,
  ] = await Promise.all([
    db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, dbUserId),
    }),
    db.query.users.findFirst({ where: eq(users.id, dbUserId) }),
    db.select().from(savedVerses).where(eq(savedVerses.userId, dbUserId)),
    db.select().from(highlights).where(eq(highlights.userId, dbUserId)),
    db
      .select()
      .from(notes)
      .where(and(eq(notes.userId, dbUserId), isNull(notes.deletedAt))),
    db.select().from(favoritePeople).where(eq(favoritePeople.userId, dbUserId)),
    db.select().from(readingList).where(eq(readingList.userId, dbUserId)),
    db.select().from(recentSearches).where(eq(recentSearches.userId, dbUserId)),
    db.select().from(readingHistory).where(eq(readingHistory.userId, dbUserId)),
    db
      .select()
      .from(prayerRuleItems)
      .where(eq(prayerRuleItems.userId, dbUserId)),
    db.select().from(activityDays).where(eq(activityDays.userId, dbUserId)),
    db
      .select()
      .from(contentCompletions)
      .where(eq(contentCompletions.userId, dbUserId)),
  ]);

  if (!profileRow || !userRow) {
    throw new Error(
      `getSnapshot: missing profile/user row for db user ${dbUserId}`,
    );
  }

  const profile = profileRowToDto(profileRow);

  return {
    profile,
    savedVerses: savedVerseRows.map((r) => ({
      id: r.id,
      clientId: r.clientId,
      verseKey: r.verseKey,
      translationId: r.translationId,
      createdAt: ISO(r.createdAt),
      updatedAt: ISO(r.updatedAt),
    })),
    highlights: highlightRows.map((r) => ({
      id: r.id,
      clientId: r.clientId,
      targetType: r.targetType,
      targetId: r.targetId,
      color: r.color,
      excerpt: r.excerpt,
      createdAt: ISO(r.createdAt),
      updatedAt: ISO(r.updatedAt),
    })),
    notes: noteRows.map((r) => ({
      id: r.id,
      clientId: r.clientId,
      targetType: r.targetType,
      targetId: r.targetId,
      title: r.title,
      body: r.body,
      version: r.version,
      createdAt: ISO(r.createdAt),
      updatedAt: ISO(r.updatedAt),
    })),
    favoritePeople: favoriteRows.map((r) => ({
      id: r.id,
      clientId: r.clientId,
      personId: r.personId,
      createdAt: ISO(r.createdAt),
      updatedAt: ISO(r.updatedAt),
    })),
    readingList: readingListRows.map((r) => ({
      id: r.id,
      clientId: r.clientId,
      workId: r.workId,
      status: r.status,
      positionChapterOrder: r.positionChapterOrder,
      createdAt: ISO(r.createdAt),
      updatedAt: ISO(r.updatedAt),
    })),
    recentSearches: recentSearchRows.map((r) => ({
      id: r.id,
      clientId: r.clientId,
      query: r.query,
      createdAt: ISO(r.createdAt),
      updatedAt: ISO(r.updatedAt),
    })),
    readingHistory: readingHistoryRows.map((r) => ({
      id: r.id,
      clientId: r.clientId,
      href: r.href,
      label: r.label,
      createdAt: ISO(r.createdAt),
      updatedAt: ISO(r.updatedAt),
    })),
    prayerRule: {
      morning: prayerRuleRows
        .filter((r) => r.slot === "morning")
        .sort((a, b) => a.position - b.position)
        .map((r) => ({
          id: r.id,
          clientId: r.clientId,
          slot: r.slot,
          itemId: r.itemId,
          position: r.position,
          createdAt: ISO(r.createdAt),
          updatedAt: ISO(r.updatedAt),
        })),
      evening: prayerRuleRows
        .filter((r) => r.slot === "evening")
        .sort((a, b) => a.position - b.position)
        .map((r) => ({
          id: r.id,
          clientId: r.clientId,
          slot: r.slot,
          itemId: r.itemId,
          position: r.position,
          createdAt: ISO(r.createdAt),
          updatedAt: ISO(r.updatedAt),
        })),
    },
    activityDays: activityDayRows.map((r) => r.day),
    completions: completionRows.map((r) => ({
      id: r.id,
      kind: r.kind,
      slug: r.slug,
      completedAt: ISO(r.completedAt),
    })),
    onboardingStatus: userRow.onboardingStatus,
  };
}

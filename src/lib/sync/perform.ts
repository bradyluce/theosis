"use client";

// Translates a PendingWrite into the corresponding /api/me/* HTTP call via
// the singleton me-client. Pure: takes a write, returns a promise. The
// queue runner (queue.ts) handles when to call this and how to handle errors.

import type { PendingWrite } from "@theosis/core/sync";

import { getMeApi } from "./client";

export async function performWrite(write: PendingWrite): Promise<void> {
  const api = getMeApi();
  switch (write.kind) {
    case "profile.patch": {
      // Profile PATCH requires an expectedVersion — for fire-and-forget
      // sync we'd need to refetch first. Phase 2 writes profile only via
      // the explicit save-preferences flows, which fetch the current
      // version before submitting. Drop the queued patch if it arrives
      // here without a version.
      return;
    }
    case "savedVerse.create":
      await api.createSavedVerse({
        clientId: write.clientId,
        verseKey: write.verseKey,
        translationId: write.translationId,
      });
      return;
    case "savedVerse.delete":
      await api.deleteSavedVerse(write.clientId);
      return;
    case "highlight.upsert":
      await api.upsertHighlight({
        clientId: write.clientId,
        targetType: write.targetType,
        targetId: write.targetId,
        color: write.color,
        excerpt: write.excerpt,
      });
      return;
    case "highlight.delete":
      await api.deleteHighlight(write.clientId);
      return;
    case "note.upsert":
      await api.upsertNote({
        clientId: write.clientId,
        targetType: write.targetType,
        targetId: write.targetId,
        title: write.title,
        body: write.body,
        expectedVersion: write.version,
      });
      return;
    case "note.delete":
      await api.deleteNote(write.clientId);
      return;
    case "favoritePerson.create":
      await api.createFavoritePerson({
        clientId: write.clientId,
        personId: write.personId,
      });
      return;
    case "favoritePerson.delete":
      await api.deleteFavoritePerson(write.clientId);
      return;
    case "readingList.upsert":
      await api.upsertReadingList({
        clientId: write.clientId,
        workId: write.workId,
        status: write.status,
        positionChapterOrder: write.positionChapterOrder,
      });
      return;
    case "readingList.delete":
      await api.deleteReadingListItem(write.clientId);
      return;
    case "recentSearch.create":
      await api.createRecentSearch({
        clientId: write.clientId,
        query: write.query,
      });
      return;
    case "recentSearch.clear":
      await api.clearRecentSearches();
      return;
    case "readingHistory.create":
      await api.createReadingHistoryEntry({
        clientId: write.clientId,
        href: write.href,
        label: write.label,
      });
      return;
    case "prayerRule.replace":
      await api.replacePrayerRule({
        morning: write.morning,
        evening: write.evening,
      });
      return;
    case "activityDay.record":
      await api.recordActivityDay(write.day);
      return;
    case "completion.create":
      await api.createCompletion({
        kind: write.kind_,
        slug: write.slug,
      });
      return;
    default: {
      // Exhaustiveness check
      const _exhaustive: never = write;
      void _exhaustive;
      return;
    }
  }
}

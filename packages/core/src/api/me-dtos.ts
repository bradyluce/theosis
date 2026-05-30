// zod DTOs for every /api/me payload. Single source of truth for both
// the server route handlers (input validation) and the clients (response
// parsing). Inferred TS types mirror the domain user-types but with ISO
// strings instead of Date and `clientId` always required.

import { z } from "zod";

// ---------------------------------------------------------------------------
// Enum schemas (mirror the Drizzle pgEnum literals exactly)
// ---------------------------------------------------------------------------

export const highlightColorSchema = z.enum([
  "gold",
  "rose",
  "sky",
  "sage",
  "lavender",
]);

export const highlightTargetTypeSchema = z.enum([
  "verse",
  "commentary",
  "work-section",
]);

export const noteTargetTypeSchema = z.enum([
  "verse",
  "chapter",
  "work",
  "person",
]);

export const readingListStatusSchema = z.enum([
  "read-later",
  "reading",
  "read",
]);

export const calendarPrefSchema = z.enum(["new-calendar", "old-calendar"]);

export const userStatusSchema = z.enum(["orthodox", "catechumen", "inquirer"]);

export const commentaryRankingSchema = z.enum([
  "balanced",
  "ancient-first",
  "modern-first",
]);

export const textSizeSchema = z.enum(["sm", "md", "lg", "xl"]);

export const fastingLevelSchema = z.enum(["strict", "standard", "relaxed"]);

export const prayerRuleSlotSchema = z.enum(["morning", "evening"]);

export const completionKindSchema = z.enum([
  "guide",
  "topic",
  "work-chapter",
]);

export const onboardingStatusSchema = z.enum([
  "anonymous",
  "needs_onboarding",
  "complete",
]);

// ---------------------------------------------------------------------------
// User profile (preferences)
// ---------------------------------------------------------------------------

export const userProfileDto = z.object({
  calendarPreference: calendarPrefSchema,
  primaryTranslationId: z.string(),
  textSize: textSizeSchema,
  status: userStatusSchema.nullable(),
  jurisdiction: z.string().nullable(),
  parish: z.string().nullable(),
  parishId: z.string().nullable(),
  location: z.string().nullable(),
  // ISO "YYYY-MM-DD" or null. Surfaced as month/day only on the client.
  birthday: z.string().nullable(),
  patronSaintSlug: z.string().nullable(),
  preferredFatherIds: z.array(z.string()),
  hiddenFatherIds: z.array(z.string()),
  commentaryRanking: commentaryRankingSchema,
  fastingLevel: fastingLevelSchema,
  dailyCardOrder: z.array(z.string()),
  version: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type UserProfileDto = z.infer<typeof userProfileDto>;

// PATCH input — every field optional. Server validates `version` separately
// (against the row's current version) and bumps it on success.
export const updateProfileInput = userProfileDto
  .partial()
  .omit({ createdAt: true, updatedAt: true })
  .extend({
    // Required on every PATCH for optimistic concurrency.
    expectedVersion: z.number().int(),
  });
export type UpdateProfileInput = z.infer<typeof updateProfileInput>;

// ---------------------------------------------------------------------------
// Saved verses
// ---------------------------------------------------------------------------

export const savedVerseDto = z.object({
  id: z.string().uuid(),
  clientId: z.string(),
  verseKey: z.string(),
  translationId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SavedVerseDto = z.infer<typeof savedVerseDto>;

export const createSavedVerseInput = z.object({
  clientId: z.string().min(1),
  verseKey: z.string().min(1),
  translationId: z.string().min(1),
});
export type CreateSavedVerseInput = z.infer<typeof createSavedVerseInput>;

// ---------------------------------------------------------------------------
// Highlights
// ---------------------------------------------------------------------------

export const highlightDto = z.object({
  id: z.string().uuid(),
  clientId: z.string(),
  targetType: highlightTargetTypeSchema,
  targetId: z.string(),
  color: highlightColorSchema,
  excerpt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type HighlightDto = z.infer<typeof highlightDto>;

export const upsertHighlightInput = z.object({
  clientId: z.string().min(1),
  targetType: highlightTargetTypeSchema,
  targetId: z.string().min(1),
  color: highlightColorSchema,
  excerpt: z.string().optional(),
});
export type UpsertHighlightInput = z.infer<typeof upsertHighlightInput>;

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

export const noteDto = z.object({
  id: z.string().uuid(),
  clientId: z.string(),
  targetType: noteTargetTypeSchema,
  targetId: z.string(),
  title: z.string(),
  body: z.string(),
  version: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type NoteDto = z.infer<typeof noteDto>;

export const upsertNoteInput = z.object({
  clientId: z.string().min(1),
  targetType: noteTargetTypeSchema,
  targetId: z.string().min(1),
  title: z.string(),
  body: z.string(),
  // Required for optimistic concurrency. New notes pass `version: 0`; updates
  // pass the version they last fetched. Server returns 409 on mismatch.
  expectedVersion: z.number().int(),
});
export type UpsertNoteInput = z.infer<typeof upsertNoteInput>;

// ---------------------------------------------------------------------------
// Favorite people
// ---------------------------------------------------------------------------

export const favoritePersonDto = z.object({
  id: z.string().uuid(),
  clientId: z.string(),
  personId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type FavoritePersonDto = z.infer<typeof favoritePersonDto>;

export const createFavoritePersonInput = z.object({
  clientId: z.string().min(1),
  personId: z.string().min(1),
});
export type CreateFavoritePersonInput = z.infer<
  typeof createFavoritePersonInput
>;

// ---------------------------------------------------------------------------
// Reading list
// ---------------------------------------------------------------------------

export const readingListItemDto = z.object({
  id: z.string().uuid(),
  clientId: z.string(),
  workId: z.string(),
  status: readingListStatusSchema,
  positionChapterOrder: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ReadingListItemDto = z.infer<typeof readingListItemDto>;

export const upsertReadingListInput = z.object({
  clientId: z.string().min(1),
  workId: z.string().min(1),
  status: readingListStatusSchema,
  positionChapterOrder: z.number().int().optional(),
});
export type UpsertReadingListInput = z.infer<typeof upsertReadingListInput>;

// ---------------------------------------------------------------------------
// Recent searches
// ---------------------------------------------------------------------------

export const recentSearchDto = z.object({
  id: z.string().uuid(),
  clientId: z.string(),
  query: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type RecentSearchDto = z.infer<typeof recentSearchDto>;

export const createRecentSearchInput = z.object({
  clientId: z.string().min(1),
  query: z.string().min(1),
});
export type CreateRecentSearchInput = z.infer<typeof createRecentSearchInput>;

// ---------------------------------------------------------------------------
// Reading history
// ---------------------------------------------------------------------------

export const readingHistoryEntryDto = z.object({
  id: z.string().uuid(),
  clientId: z.string(),
  href: z.string(),
  label: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ReadingHistoryEntryDto = z.infer<typeof readingHistoryEntryDto>;

export const createReadingHistoryInput = z.object({
  clientId: z.string().min(1),
  href: z.string().min(1),
  label: z.string().min(1),
});
export type CreateReadingHistoryInput = z.infer<
  typeof createReadingHistoryInput
>;

// ---------------------------------------------------------------------------
// Prayer rule
// ---------------------------------------------------------------------------

export const prayerRuleItemDto = z.object({
  id: z.string().uuid(),
  clientId: z.string(),
  slot: prayerRuleSlotSchema,
  itemId: z.string(),
  position: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PrayerRuleItemDto = z.infer<typeof prayerRuleItemDto>;

export const prayerRuleDto = z.object({
  morning: z.array(prayerRuleItemDto),
  evening: z.array(prayerRuleItemDto),
});
export type PrayerRuleDto = z.infer<typeof prayerRuleDto>;

export const replacePrayerRuleInput = z.object({
  morning: z.array(z.string()),
  evening: z.array(z.string()),
});
export type ReplacePrayerRuleInput = z.infer<typeof replacePrayerRuleInput>;

// ---------------------------------------------------------------------------
// Activity days
// ---------------------------------------------------------------------------

export const activityDayDto = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type ActivityDayDto = z.infer<typeof activityDayDto>;

export const recordActivityDayInput = z.object({
  // YYYY-MM-DD (client decides what "today" means).
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type RecordActivityDayInput = z.infer<typeof recordActivityDayInput>;

// ---------------------------------------------------------------------------
// Content completions
// ---------------------------------------------------------------------------

export const contentCompletionDto = z.object({
  id: z.string().uuid(),
  kind: completionKindSchema,
  slug: z.string(),
  completedAt: z.string(),
});
export type ContentCompletionDto = z.infer<typeof contentCompletionDto>;

export const createCompletionInput = z.object({
  kind: completionKindSchema,
  slug: z.string().min(1),
});
export type CreateCompletionInput = z.infer<typeof createCompletionInput>;

// ---------------------------------------------------------------------------
// Top-level snapshot
// ---------------------------------------------------------------------------

export const meSnapshotDto = z.object({
  profile: userProfileDto,
  savedVerses: z.array(savedVerseDto),
  highlights: z.array(highlightDto),
  notes: z.array(noteDto),
  favoritePeople: z.array(favoritePersonDto),
  readingList: z.array(readingListItemDto),
  recentSearches: z.array(recentSearchDto),
  readingHistory: z.array(readingHistoryEntryDto),
  prayerRule: prayerRuleDto,
  activityDays: z.array(z.string()),
  completions: z.array(contentCompletionDto),
  onboardingStatus: onboardingStatusSchema,
});
export type MeSnapshotDto = z.infer<typeof meSnapshotDto>;

// ---------------------------------------------------------------------------
// Import endpoint — anonymous-to-authenticated claim
// ---------------------------------------------------------------------------

// Per-collection caps on the import body. These are far above any real user's
// data (a power user won't approach them) but bound the single bulk-insert
// transaction so an authenticated client can't POST an arbitrarily large
// snapshot and force unbounded row growth / a huge transaction.
const IMPORT_MAX = {
  savedVerses: 10000,
  highlights: 10000,
  notes: 5000,
  favoritePeople: 2000,
  readingList: 5000,
  recentSearches: 200,
  readingHistory: 10000,
  prayerItems: 500,
  activityDays: 5000,
  completions: 10000,
} as const;

export const clientSnapshotDto = z.object({
  preferences: userProfileDto
    .partial()
    .omit({ version: true, createdAt: true, updatedAt: true }),
  savedVerses: z
    .array(
      z.object({
        clientId: z.string(),
        verseKey: z.string(),
        translationId: z.string(),
      }),
    )
    .max(IMPORT_MAX.savedVerses),
  highlights: z
    .array(
      z.object({
        clientId: z.string(),
        targetType: highlightTargetTypeSchema,
        targetId: z.string(),
        color: highlightColorSchema,
        excerpt: z.string().optional(),
      }),
    )
    .max(IMPORT_MAX.highlights),
  notes: z
    .array(
      z.object({
        clientId: z.string(),
        targetType: noteTargetTypeSchema,
        targetId: z.string(),
        title: z.string(),
        body: z.string(),
      }),
    )
    .max(IMPORT_MAX.notes),
  favoritePeople: z
    .array(z.object({ clientId: z.string(), personId: z.string() }))
    .max(IMPORT_MAX.favoritePeople),
  readingList: z
    .array(
      z.object({
        clientId: z.string(),
        workId: z.string(),
        status: readingListStatusSchema,
        positionChapterOrder: z.number().int().optional(),
      }),
    )
    .max(IMPORT_MAX.readingList),
  recentSearches: z
    .array(z.object({ clientId: z.string(), query: z.string() }))
    .max(IMPORT_MAX.recentSearches),
  readingHistory: z
    .array(
      z.object({
        clientId: z.string(),
        href: z.string(),
        label: z.string(),
      }),
    )
    .max(IMPORT_MAX.readingHistory),
  prayerRule: z.object({
    morning: z.array(z.string()).max(IMPORT_MAX.prayerItems),
    evening: z.array(z.string()).max(IMPORT_MAX.prayerItems),
  }),
  activityDays: z
    .array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .max(IMPORT_MAX.activityDays),
  completions: z
    .array(z.object({ kind: completionKindSchema, slug: z.string() }))
    .max(IMPORT_MAX.completions),
});
export type ClientSnapshotDto = z.infer<typeof clientSnapshotDto>;

export const importPayloadDto = z.object({
  anonymousId: z.string().uuid(),
  snapshot: clientSnapshotDto,
});
export type ImportPayloadDto = z.infer<typeof importPayloadDto>;

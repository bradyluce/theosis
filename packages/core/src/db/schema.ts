// Drizzle schema for the per-user data store. Imported via the deep export
// `@theosis/core/db/schema` — NOT re-exported from the package barrel, so
// the mobile bundle never pulls in drizzle-orm / pg.
//
// Conventions:
//   - One table per entity (savedVerses, highlights, notes, …); preferences
//     fold into a single `user_profiles` row.
//   - Server PK is always `uuid` ("id"); `client_id` carries the stable
//     string the client knows (e.g. "saved-john.1.14") so optimistic POSTs
//     can dedupe without round-tripping the uuid.
//   - Hard deletes everywhere EXCEPT `notes` — those carry real prose; soft
//     delete via `deleted_at`.
//   - `created_at` / `updated_at` per row for last-write-wins conflict
//     resolution. `notes` adds an integer `version` for optimistic
//     concurrency since cross-device note conflicts deserve a real surface.

import { sql } from "drizzle-orm";
import {
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Enums (single source of truth — referenced by both Drizzle and zod DTOs)
// ---------------------------------------------------------------------------

export const highlightColorEnum = pgEnum("highlight_color", [
  "gold",
  "rose",
  "sky",
  "sage",
  "lavender",
]);

export const highlightTargetTypeEnum = pgEnum("highlight_target_type", [
  "verse",
  "commentary",
  "work-section",
]);

export const noteTargetTypeEnum = pgEnum("note_target_type", [
  "verse",
  "chapter",
  "work",
  "person",
]);

export const readingListStatusEnum = pgEnum("reading_list_status", [
  "read-later",
  "reading",
  "read",
]);

export const calendarPrefEnum = pgEnum("calendar_pref", [
  "new-calendar",
  "old-calendar",
]);

export const userStatusEnum = pgEnum("user_status", [
  "orthodox",
  "catechumen",
  "inquirer",
]);

export const commentaryRankingEnum = pgEnum("commentary_ranking", [
  "balanced",
  "ancient-first",
  "modern-first",
]);

export const textSizeEnum = pgEnum("text_size", ["sm", "md", "lg", "xl"]);

export const fastingLevelEnum = pgEnum("fasting_level", [
  "strict",
  "standard",
  "relaxed",
]);

export const prayerRuleSlotEnum = pgEnum("prayer_rule_slot", [
  "morning",
  "evening",
]);

export const completionKindEnum = pgEnum("completion_kind", [
  "guide",
  "topic",
  "work-chapter",
]);

export const onboardingStatusEnum = pgEnum("onboarding_status", [
  "anonymous",
  "needs_onboarding",
  "complete",
]);

// ---------------------------------------------------------------------------
// Users — Clerk identity → Postgres uuid mapping
// ---------------------------------------------------------------------------

// We deliberately do NOT denormalize email/firstName/lastName here — Clerk
// owns those and we read them off `useUser()` on the client. Keeping them out
// avoids drift and a webhook dependency in Phase 1.
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkUserId: text("clerk_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Imprint of the device id that claimed this account. Lets us detect a
    // second device trying to also claim anonymous data — see /api/me/import.
    importedFromAnonymousId: text("imported_from_anonymous_id"),
    onboardingStatus: onboardingStatusEnum("onboarding_status")
      .notNull()
      .default("needs_onboarding"),
  },
  (t) => [uniqueIndex("users_clerk_user_id_uniq").on(t.clerkUserId)],
);

// ---------------------------------------------------------------------------
// User profile — one row per user, all preferences
// ---------------------------------------------------------------------------

// Single row chosen because preferences are read together on every page load.
// One indexed lookup; no N+1. Every preference field — including Phase 4 ones
// (text_size, fasting_level, jurisdiction, daily_card_order) — is declared
// upfront so we don't need follow-up migrations when those fields surface in UI.
export const userProfiles = pgTable("user_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),

  // Reader / calendar
  calendarPreference: calendarPrefEnum("calendar_preference")
    .notNull()
    .default("new-calendar"),
  primaryTranslationId: text("primary_translation_id")
    .notNull()
    .default("kjva"),
  textSize: textSizeEnum("text_size").notNull().default("md"),

  // Identity
  status: userStatusEnum("status"),
  jurisdiction: text("jurisdiction"),
  parish: text("parish"),
  parishId: text("parish_id"),
  location: text("location"),

  // Patron + father preferences
  patronSaintSlug: text("patron_saint_slug"),
  preferredFatherIds: text("preferred_father_ids")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  hiddenFatherIds: text("hidden_father_ids")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  commentaryRanking: commentaryRankingEnum("commentary_ranking")
    .notNull()
    .default("balanced"),

  // Practice
  fastingLevel: fastingLevelEnum("fasting_level")
    .notNull()
    .default("standard"),
  // String[] of DailyCardKey values. Renderer falls back to default order
  // for missing keys; unknown keys are ignored.
  dailyCardOrder: text("daily_card_order")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  // Optimistic concurrency token. Client sends its known version on PATCH;
  // server returns 409 with the current row on mismatch.
  version: integer("version").notNull().default(1),
});

// ---------------------------------------------------------------------------
// Saved verses
// ---------------------------------------------------------------------------

export const savedVerses = pgTable(
  "saved_verses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clientId: text("client_id").notNull(),
    // Translation-agnostic key "<book>.<chapter>.<verse>".
    verseKey: text("verse_key").notNull(),
    // Display-only — the translation the user was reading from.
    translationId: text("translation_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("saved_verses_user_verse_uniq").on(t.userId, t.verseKey),
    uniqueIndex("saved_verses_user_client_uniq").on(t.userId, t.clientId),
    index("saved_verses_user_idx").on(t.userId),
  ],
);

// ---------------------------------------------------------------------------
// Highlights
// ---------------------------------------------------------------------------

export const highlights = pgTable(
  "highlights",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clientId: text("client_id").notNull(),
    targetType: highlightTargetTypeEnum("target_type").notNull(),
    targetId: text("target_id").notNull(),
    color: highlightColorEnum("color").notNull(),
    excerpt: text("excerpt"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("highlights_user_target_uniq").on(
      t.userId,
      t.targetType,
      t.targetId,
    ),
    uniqueIndex("highlights_user_client_uniq").on(t.userId, t.clientId),
    index("highlights_user_idx").on(t.userId),
  ],
);

// ---------------------------------------------------------------------------
// Notes — soft delete via deleted_at, optimistic concurrency via version
// ---------------------------------------------------------------------------

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clientId: text("client_id").notNull(),
    targetType: noteTargetTypeEnum("target_type").notNull(),
    targetId: text("target_id").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    version: integer("version").notNull().default(1),
  },
  (t) => [
    // One active note per (user, target) — matches current upsertNote semantics.
    uniqueIndex("notes_user_target_uniq")
      .on(t.userId, t.targetType, t.targetId)
      .where(sql`${t.deletedAt} IS NULL`),
    index("notes_user_idx")
      .on(t.userId)
      .where(sql`${t.deletedAt} IS NULL`),
  ],
);

// ---------------------------------------------------------------------------
// Favorite people
// ---------------------------------------------------------------------------

export const favoritePeople = pgTable(
  "favorite_people",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clientId: text("client_id").notNull(),
    personId: text("person_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("favorite_people_user_person_uniq").on(t.userId, t.personId),
    index("favorite_people_user_idx").on(t.userId),
  ],
);

// ---------------------------------------------------------------------------
// Reading list
// ---------------------------------------------------------------------------

export const readingList = pgTable(
  "reading_list",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clientId: text("client_id").notNull(),
    workId: text("work_id").notNull(),
    status: readingListStatusEnum("status").notNull(),
    // Order index within the work's chapter list (set when the user has
    // scrolled past chapter 1). Optional — works without recorded positions
    // simply lack this field.
    positionChapterOrder: integer("position_chapter_order"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("reading_list_user_work_uniq").on(t.userId, t.workId),
    index("reading_list_user_idx").on(t.userId),
  ],
);

// ---------------------------------------------------------------------------
// Recent searches — lowercased dedup, trimmed to 8 on the client
// ---------------------------------------------------------------------------

export const recentSearches = pgTable(
  "recent_searches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clientId: text("client_id").notNull(),
    query: text("query").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("recent_searches_user_query_uniq").on(
      t.userId,
      sql`lower(${t.query})`,
    ),
    index("recent_searches_user_idx").on(t.userId),
  ],
);

// ---------------------------------------------------------------------------
// Reading history
// ---------------------------------------------------------------------------

export const readingHistory = pgTable(
  "reading_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clientId: text("client_id").notNull(),
    href: text("href").notNull(),
    label: text("label").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("reading_history_user_href_uniq").on(t.userId, t.href),
    index("reading_history_user_idx").on(t.userId),
  ],
);

// ---------------------------------------------------------------------------
// Prayer rule items — one row per item per slot
// ---------------------------------------------------------------------------

// position is a real-valued sort key so inserting between items doesn't
// require renumbering the whole list (write a position between the two).
export const prayerRuleItems = pgTable(
  "prayer_rule_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clientId: text("client_id").notNull(),
    slot: prayerRuleSlotEnum("slot").notNull(),
    itemId: text("item_id").notNull(),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("prayer_rule_items_user_slot_idx").on(t.userId, t.slot, t.position),
  ],
);

// ---------------------------------------------------------------------------
// Activity days — one row per day per user (sparse; streak is derived)
// ---------------------------------------------------------------------------

// `day` is stored as text "YYYY-MM-DD" not date so timezone math doesn't
// surprise us — the client decides what "today" means in its locale.
export const activityDays = pgTable(
  "activity_days",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    day: text("day").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day] })],
);

// ---------------------------------------------------------------------------
// Content completions — "✓ read" marks on guides/topics/work-chapters
// ---------------------------------------------------------------------------

export const contentCompletions = pgTable(
  "content_completions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: completionKindEnum("kind").notNull(),
    slug: text("slug").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("content_completions_user_kind_slug_uniq").on(
      t.userId,
      t.kind,
      t.slug,
    ),
    index("content_completions_user_idx").on(t.userId),
  ],
);

// ---------------------------------------------------------------------------
// Type exports (for Drizzle-aware code; safe to import in server code only)
// ---------------------------------------------------------------------------

export type DbUser = typeof users.$inferSelect;
export type DbUserProfile = typeof userProfiles.$inferSelect;
export type DbSavedVerse = typeof savedVerses.$inferSelect;
export type DbHighlight = typeof highlights.$inferSelect;
export type DbNote = typeof notes.$inferSelect;
export type DbFavoritePerson = typeof favoritePeople.$inferSelect;
export type DbReadingListItem = typeof readingList.$inferSelect;
export type DbRecentSearch = typeof recentSearches.$inferSelect;
export type DbReadingHistoryEntry = typeof readingHistory.$inferSelect;
export type DbPrayerRuleItem = typeof prayerRuleItems.$inferSelect;
export type DbActivityDay = typeof activityDays.$inferSelect;
export type DbContentCompletion = typeof contentCompletions.$inferSelect;

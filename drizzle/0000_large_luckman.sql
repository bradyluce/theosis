CREATE TYPE "public"."calendar_pref" AS ENUM('new-calendar', 'old-calendar');--> statement-breakpoint
CREATE TYPE "public"."commentary_ranking" AS ENUM('balanced', 'ancient-first', 'modern-first');--> statement-breakpoint
CREATE TYPE "public"."completion_kind" AS ENUM('guide', 'topic', 'work-chapter');--> statement-breakpoint
CREATE TYPE "public"."fasting_level" AS ENUM('strict', 'standard', 'relaxed');--> statement-breakpoint
CREATE TYPE "public"."highlight_color" AS ENUM('gold', 'rose', 'sky', 'sage', 'lavender');--> statement-breakpoint
CREATE TYPE "public"."highlight_target_type" AS ENUM('verse', 'commentary', 'work-section');--> statement-breakpoint
CREATE TYPE "public"."note_target_type" AS ENUM('verse', 'chapter', 'work', 'person');--> statement-breakpoint
CREATE TYPE "public"."onboarding_status" AS ENUM('anonymous', 'needs_onboarding', 'complete');--> statement-breakpoint
CREATE TYPE "public"."prayer_rule_slot" AS ENUM('morning', 'evening');--> statement-breakpoint
CREATE TYPE "public"."reading_list_status" AS ENUM('read-later', 'reading', 'read');--> statement-breakpoint
CREATE TYPE "public"."text_size" AS ENUM('sm', 'md', 'lg', 'xl');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('orthodox', 'catechumen', 'inquirer');--> statement-breakpoint
CREATE TABLE "activity_days" (
	"user_id" uuid NOT NULL,
	"day" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "activity_days_user_id_day_pk" PRIMARY KEY("user_id","day")
);
--> statement-breakpoint
CREATE TABLE "content_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "completion_kind" NOT NULL,
	"slug" text NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorite_people" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"client_id" text NOT NULL,
	"person_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "highlights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"client_id" text NOT NULL,
	"target_type" "highlight_target_type" NOT NULL,
	"target_id" text NOT NULL,
	"color" "highlight_color" NOT NULL,
	"excerpt" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"client_id" text NOT NULL,
	"target_type" "note_target_type" NOT NULL,
	"target_id" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prayer_rule_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"client_id" text NOT NULL,
	"slot" "prayer_rule_slot" NOT NULL,
	"item_id" text NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reading_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"client_id" text NOT NULL,
	"href" text NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reading_list" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"client_id" text NOT NULL,
	"work_id" text NOT NULL,
	"status" "reading_list_status" NOT NULL,
	"position_chapter_order" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recent_searches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"client_id" text NOT NULL,
	"query" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_verses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"client_id" text NOT NULL,
	"verse_key" text NOT NULL,
	"translation_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"calendar_preference" "calendar_pref" DEFAULT 'new-calendar' NOT NULL,
	"primary_translation_id" text DEFAULT 'kjva' NOT NULL,
	"text_size" text_size DEFAULT 'md' NOT NULL,
	"status" "user_status",
	"jurisdiction" text,
	"parish" text,
	"parish_id" text,
	"location" text,
	"patron_saint_slug" text,
	"preferred_father_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"hidden_father_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"commentary_ranking" "commentary_ranking" DEFAULT 'balanced' NOT NULL,
	"fasting_level" "fasting_level" DEFAULT 'standard' NOT NULL,
	"daily_card_order" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"imported_from_anonymous_id" text,
	"onboarding_status" "onboarding_status" DEFAULT 'needs_onboarding' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_days" ADD CONSTRAINT "activity_days_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_completions" ADD CONSTRAINT "content_completions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite_people" ADD CONSTRAINT "favorite_people_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "highlights" ADD CONSTRAINT "highlights_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prayer_rule_items" ADD CONSTRAINT "prayer_rule_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_history" ADD CONSTRAINT "reading_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_list" ADD CONSTRAINT "reading_list_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recent_searches" ADD CONSTRAINT "recent_searches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_verses" ADD CONSTRAINT "saved_verses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "content_completions_user_kind_slug_uniq" ON "content_completions" USING btree ("user_id","kind","slug");--> statement-breakpoint
CREATE INDEX "content_completions_user_idx" ON "content_completions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "favorite_people_user_person_uniq" ON "favorite_people" USING btree ("user_id","person_id");--> statement-breakpoint
CREATE INDEX "favorite_people_user_idx" ON "favorite_people" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "highlights_user_target_uniq" ON "highlights" USING btree ("user_id","target_type","target_id");--> statement-breakpoint
CREATE UNIQUE INDEX "highlights_user_client_uniq" ON "highlights" USING btree ("user_id","client_id");--> statement-breakpoint
CREATE INDEX "highlights_user_idx" ON "highlights" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notes_user_target_uniq" ON "notes" USING btree ("user_id","target_type","target_id") WHERE "notes"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "notes_user_idx" ON "notes" USING btree ("user_id") WHERE "notes"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "prayer_rule_items_user_slot_idx" ON "prayer_rule_items" USING btree ("user_id","slot","position");--> statement-breakpoint
CREATE UNIQUE INDEX "reading_history_user_href_uniq" ON "reading_history" USING btree ("user_id","href");--> statement-breakpoint
CREATE INDEX "reading_history_user_idx" ON "reading_history" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reading_list_user_work_uniq" ON "reading_list" USING btree ("user_id","work_id");--> statement-breakpoint
CREATE INDEX "reading_list_user_idx" ON "reading_list" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "recent_searches_user_query_uniq" ON "recent_searches" USING btree ("user_id",lower("query"));--> statement-breakpoint
CREATE INDEX "recent_searches_user_idx" ON "recent_searches" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "saved_verses_user_verse_uniq" ON "saved_verses" USING btree ("user_id","verse_key");--> statement-breakpoint
CREATE UNIQUE INDEX "saved_verses_user_client_uniq" ON "saved_verses" USING btree ("user_id","client_id");--> statement-breakpoint
CREATE INDEX "saved_verses_user_idx" ON "saved_verses" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_clerk_user_id_uniq" ON "users" USING btree ("clerk_user_id");
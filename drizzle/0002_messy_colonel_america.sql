CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE "content_embeddings" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"href" text NOT NULL,
	"kicker" text NOT NULL,
	"snippet" text NOT NULL,
	"embedding" vector(384) NOT NULL
);
--> statement-breakpoint
CREATE INDEX "content_embeddings_embedding_hnsw" ON "content_embeddings" USING hnsw ("embedding" vector_cosine_ops);
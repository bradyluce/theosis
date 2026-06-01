-- content_embeddings is a derived index (rebuilt by scripts/search/build-embeddings.ts).
-- TRUNCATE first: frees the 481 MB that filled the Neon project, AND leaves the
-- table empty so the vector->halfvec type change is instant (no row rewrite, no
-- cast needed) instead of failing on a full DB.
TRUNCATE TABLE "content_embeddings";--> statement-breakpoint
DROP INDEX "content_embeddings_embedding_hnsw";--> statement-breakpoint
ALTER TABLE "content_embeddings" ALTER COLUMN "embedding" SET DATA TYPE halfvec(384);--> statement-breakpoint
CREATE INDEX "content_embeddings_embedding_hnsw" ON "content_embeddings" USING hnsw ("embedding" halfvec_cosine_ops);
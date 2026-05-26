import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// Drizzle Kit config. Generates migrations from the schema in @theosis/core
// and reads/writes them under ./drizzle. Connection string is read from
// POSTGRES_URL_NON_POOLING (Vercel Postgres exposes both pooled and
// non-pooled URLs — migrations need the non-pooled one because pgbouncer
// breaks Drizzle's prepared statements).

const connectionString =
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  "";

export default defineConfig({
  schema: "./packages/core/src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: connectionString },
  // Verbose so generated SQL is reviewable in PRs.
  verbose: true,
  // Strict so we catch destructive operations in CI before they hit prod.
  strict: true,
});

// Apply Drizzle migrations from ./drizzle to the configured Postgres.
// Run via `npm run db:migrate`. Reads connection string from .env.local then
// .env (mirrors drizzle.config.ts). Uses the non-pooled URL because Drizzle's
// prepared statements don't play well with pgbouncer.

import { config as dotenv } from "dotenv";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import ws from "ws";

dotenv({ path: ".env.local" });
dotenv({ path: ".env" });

if (typeof globalThis.WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

const connectionString =
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  "";

if (!connectionString) {
  console.error(
    "[db:migrate] No Postgres connection string found. Set POSTGRES_URL_NON_POOLING (preferred) or DATABASE_URL in .env.local.",
  );
  process.exit(1);
}

async function main() {
  const pool = new Pool({ connectionString });
  const db = drizzle(pool);
  console.log("[db:migrate] applying migrations from ./drizzle");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("[db:migrate] done");
  await pool.end();
}

main().catch((err) => {
  console.error("[db:migrate] failed:", err);
  process.exit(1);
});

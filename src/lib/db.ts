import "server-only";

// Drizzle client over Neon's serverless driver (the SDK Vercel now uses for
// its native Postgres integration — @vercel/postgres is deprecated). We
// pick `neon-serverless` over `neon-http` because the import endpoint
// (`/api/me/import`) needs real transactions, and neon-http doesn't
// support them.
//
// Schema is imported via the deep export `@theosis/core/db/schema` so the
// mobile bundle never pulls in drizzle-orm / pg — the barrel `@theosis/core`
// index does not re-export schema.

import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "@theosis/core/db/schema";

// In the Node runtime (anything that's not the Edge runtime), the Neon
// driver needs a real WebSocket constructor. The Edge runtime has one
// built in, so this is a no-op there.
if (typeof globalThis.WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

const connectionString = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  // Fail loudly at module load rather than silently constructing a pool
  // with an empty string — the Neon driver would otherwise emit cryptic
  // "ENOTFOUND ''" errors on the first query. This message is what shows
  // up in Vercel build / function logs if someone forgets to wire the
  // Postgres integration on a new environment.
  throw new Error(
    "[db] Missing POSTGRES_URL / DATABASE_URL — set the Vercel Postgres integration on this environment (Vercel dashboard → Project → Storage), or run `vercel env pull .env.local` for local dev.",
  );
}

// Module-scoped pool — survives function warm starts on Vercel.
const pool = new Pool({ connectionString });

export const db = drizzle(pool, { schema });

export type Database = typeof db;

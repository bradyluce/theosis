// Quick sanity check — list all tables in the connected Postgres. Verifies
// migrations actually landed. One-off script; not wired to a package.json
// command (run via `tsx scripts/db/list-tables.ts`).

import { config as dotenv } from "dotenv";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

dotenv({ path: ".env.local" });
dotenv({ path: ".env" });

if (typeof globalThis.WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

async function main() {
  const pool = new Pool({
    connectionString:
      process.env.POSTGRES_URL_NON_POOLING ??
      process.env.DATABASE_URL ??
      process.env.POSTGRES_URL,
  });
  const { rows } = await pool.query<{ table_name: string }>(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);
  console.log(rows.map((r) => `  ${r.table_name}`).join("\n"));
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

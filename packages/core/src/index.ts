// Barrel for @theosis/core. Consumers import like:
//   import type { CommentaryEntry } from "@theosis/core";
//   import { createTheosisApi } from "@theosis/core";
//
// As more shared modules move in (calendar composer, verse-reference helpers,
// psalter numbering, etc.) they'll be re-exported here. Keep this list
// alphabetical — easy to scan when something's missing.
//
// Note: db/schema and sync are intentionally NOT re-exported here. The schema
// pulls in drizzle-orm / pg at runtime; importing it on mobile would balloon
// the bundle. Consumers that need it use the deep export
// `@theosis/core/db/schema` (server-only). Same for `@theosis/core/sync`
// when it lands runtime helpers later.

export * from "./api/client";
export * from "./api/types";
export * from "./domain/era-parser";
export * from "./domain/reading-plans";
export * from "./domain/types";
export * from "./domain/user-types";

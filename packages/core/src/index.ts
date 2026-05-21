// Barrel for @theosis/core. Consumers import like:
//   import type { CommentaryEntry } from "@theosis/core";
//   import { createTheosisApi } from "@theosis/core";
//
// As more shared modules move in (calendar composer, verse-reference helpers,
// psalter numbering, etc.) they'll be re-exported here. Keep this list
// alphabetical — easy to scan when something's missing.

export * from "./api/client";
export * from "./api/types";
export * from "./domain/types";

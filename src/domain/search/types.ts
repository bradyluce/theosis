import type { ScriptureReference } from "@theosis/core";

export type SearchIntent =
  | {
      kind: "reference";
      rawQuery: string;
      normalizedQuery: string;
      reference: ScriptureReference;
    }
  | {
      kind: "keyword";
      rawQuery: string;
      normalizedQuery: string;
    };

export type SearchResultKind =
  | "verse"
  | "commentary"
  | "work"
  | "person"
  | "topic"
  | "daily";

export type SearchResult = {
  id: string;
  kind: SearchResultKind;
  title: string;
  href: string;
  kicker: string;
  snippet: string;
  highlightTerms: string[];
  weight: number;
};

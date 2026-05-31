import type { SearchResult } from "@theosis/core";

// Map a search result's web href to a mobile route. Returns null when there is
// no corresponding mobile destination. Shared by the Library tab's keyword
// search and the Ask-the-Fathers semantic screen so both navigate identically.
export function resolveMobileTarget(result: SearchResult): string | null {
  const personMatch = result.href.match(/^\/library\/people\/([^/?#]+)/);
  if (personMatch) return `/people/${personMatch[1]}`;

  const workMatch = result.href.match(/^\/library\/works\/([^/?#]+)/);
  if (workMatch) return `/works/${workMatch[1]}`;

  const bibleMatch = result.href.match(
    /^\/bible\/([^/]+)\/([^/]+)\/(\d+)(?:#[^:]+:[^.]+\.\d+\.(\d+))?/,
  );
  if (bibleMatch) {
    const [, translation, book, chapter, verse] = bibleMatch;
    const highlight = verse ? `&highlight=${verse}` : "";
    return `/explore?translation=${translation}&book=${book}&chapter=${chapter}${highlight}`;
  }

  if (result.href === "/daily") return "/";

  // Topic results from the search engine point at the legacy /library#topic-X
  // anchor. We now have first-class topic landing pages — map there directly.
  const topicMatch = result.href.match(/^\/library#topic-([^/?#]+)/);
  if (topicMatch) return `/topics/${topicMatch[1]}`;

  return null;
}

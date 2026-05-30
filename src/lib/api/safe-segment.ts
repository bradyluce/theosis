import "server-only";

/**
 * Path-segment validator for the public content API routes.
 *
 * Translation ids, book slugs, and work ids are all lowercase hyphenated
 * slugs — e.g. "kjva", "lxx-greek", "second-maccabees", "bel-and-the-dragon",
 * "cabasilas-divine-liturgy-commentary". These segments flow from the URL
 * straight into filesystem paths (`path.join`) and S3 object keys, so an
 * unsanitized segment can climb out of the content tree.
 *
 * Next.js URL-decodes percent-encoded path segments AFTER routing, so a
 * request like `/api/bible/kjva/%2e%2e%2f%2e%2e%2fcommentary/.../1` arrives
 * here as a `book` of `../../commentary/...`. Restricting every slug segment
 * to `[a-z0-9-]` rejects `.`, `/`, `\`, `%`, and whitespace, which closes the
 * traversal without touching any legitimate slug (verified against every
 * translation and book directory in content/normalized).
 */
const SLUG_PATTERN = /^[a-z0-9-]+$/;
const MAX_SLUG_LENGTH = 128;

export function isSafeSlug(value: string | null | undefined): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= MAX_SLUG_LENGTH &&
    SLUG_PATTERN.test(value)
  );
}

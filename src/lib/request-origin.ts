import "server-only";

// Resolve the origin to use when constructing absolute URLs in API
// responses (e.g. icon URLs the mobile app fetches separately).
//
// Trust order:
//   1. `PUBLIC_ORIGIN` env var — pinned to the prod / preview hostname.
//      Set on Vercel to lock down which Host header values we'll echo
//      into response payloads, preventing Host-header injection.
//   2. The incoming request's Host header — required for `next dev -H
//      0.0.0.0` so a phone on the LAN can reach the dev server, and as
//      a fallback when PUBLIC_ORIGIN isn't configured.
//
// On Vercel we set PUBLIC_ORIGIN to `https://theosis-app-brady-luces-projects.vercel.app`
// (or any custom domain we swap in). Locally we leave it unset and fall
// through to the Host header.

export function resolveRequestOrigin(request: Request): string {
  const pinned = process.env.PUBLIC_ORIGIN;
  if (pinned) return pinned.replace(/\/$/, "");
  const url = new URL(request.url);
  const proto =
    request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = request.headers.get("host") ?? url.host;
  return `${proto}://${host}`;
}

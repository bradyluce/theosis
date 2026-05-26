import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Only protect /api/me/** — the per-user data surface. The public read-only
// content APIs (bible, commentary, daily, parishes, calendar, library,
// search, topics, guides) stay anonymous. Page routes are public too;
// gating happens later in the (shell) layout when we wire onboarding.
const isProtectedApi = createRouteMatcher(["/api/me(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedApi(req)) {
    await auth.protect();
  }
});

export const config = {
  // Match everything except Next.js internals + static assets. Next 16's
  // recommended pattern; protects API routes while letting page routes
  // through (the page-level auth check lives in their components).
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js|svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|eot|map)).*)",
    "/(api|trpc)(.*)",
  ],
};

import "server-only";

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { Webhook } from "svix";

import { db } from "@/lib/db";
import { users } from "@theosis/core/db/schema";

// Clerk webhook receiver. Configure in Clerk dashboard → Webhooks with
// endpoint URL `https://<host>/api/webhooks/clerk` and select at minimum
// the `user.deleted` event. The signing secret Clerk shows on the webhook
// detail page goes in the `CLERK_WEBHOOK_SIGNING_SECRET` env var on
// Vercel.
//
// We verify the svix signature on every request — without it the
// endpoint is a public delete-arbitrary-user mutator. If the secret is
// unset we refuse the request (501) rather than silently accept; that
// way a misconfigured deploy surfaces loudly instead of pretending to
// process events.
//
// Currently handled events:
//   user.deleted — cascade-delete the local `users` row, which fans out
//                  through every onDelete:cascade FK in the schema
//                  (highlights, notes, saved verses, favorites, reading
//                  list, recent searches, reading history, prayer rule,
//                  activity days, completions, profile).
//
// Other events are accepted and ignored (returns 200) so Clerk's retry
// logic doesn't pile up on events we don't care about.

type ClerkWebhookEvent =
  | { type: "user.deleted"; data: { id: string } }
  | { type: string; data: Record<string, unknown> };

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!secret) {
    // Surface loudly in logs but return a non-2xx so Clerk's retry queue
    // surfaces the problem in the dashboard instead of silently dropping
    // events.
    console.error(
      "[/api/webhooks/clerk] CLERK_WEBHOOK_SIGNING_SECRET is not set; refusing request",
    );
    return NextResponse.json(
      { error: "webhook_not_configured" },
      { status: 501 },
    );
  }

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: "missing_svix_headers" },
      { status: 400 },
    );
  }

  const body = await req.text();

  let event: ClerkWebhookEvent;
  try {
    const wh = new Webhook(secret);
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent;
  } catch (err) {
    // Bad signature — could be a replay or a tampered payload. Log
    // enough to debug but don't echo the body back to the client.
    console.error(
      "[/api/webhooks/clerk] signature verification failed:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ error: "bad_signature" }, { status: 400 });
  }

  if (event.type === "user.deleted") {
    const clerkUserId =
      typeof event.data === "object" && event.data && "id" in event.data
        ? String((event.data as { id: unknown }).id ?? "")
        : "";
    if (!clerkUserId) {
      return NextResponse.json(
        { error: "missing_user_id" },
        { status: 400 },
      );
    }
    try {
      await db.delete(users).where(eq(users.clerkUserId, clerkUserId));
    } catch (err) {
      // Swallow + log: returning 500 makes Clerk retry, which is what we
      // want for transient failures (network, DB). Persistent failures
      // surface in the dashboard.
      console.error(
        "[/api/webhooks/clerk] user.deleted cascade failed:",
        err instanceof Error ? err.message : err,
      );
      return NextResponse.json({ error: "cascade_failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  // Any other event type — accept and ignore so Clerk doesn't retry.
  return NextResponse.json({ ok: true, ignored: event.type });
}

import "server-only";

import { NextResponse } from "next/server";

import {
  readJson,
  withUserResponse,
} from "@/lib/me/route-helpers";
import { getSnapshot } from "@/lib/me/get-snapshot";
import { importSnapshot } from "@/lib/me/import-snapshot";
import { importPayloadDto } from "@theosis/core/api/me-dtos";

// POST /api/me/import — anonymous-to-authed claim. Body is an
// ImportPayloadDto (anonymousId + snapshot). On success, returns the
// merged MeSnapshotDto so the client can replace its local cache in one
// shot.
//
// Idempotency / multi-device:
//   - The first device's import sets users.imported_from_anonymous_id.
//   - A subsequent import from the same device is a no-op merge (the
//     server-wins ON CONFLICT DO NOTHING keeps server rows intact; new
//     rows the device may have generated since are appended).
//   - A subsequent import from a DIFFERENT device is rejected with 409
//     unless ?merge=true is passed. The web/mobile UI prompts the user
//     ("We found local data on this device that's not in your account;
//     add it now?") and retries with merge=true.

export const POST = withUserResponse(async (dbUser, req) => {
  const payload = await readJson(req, importPayloadDto);
  const merge = req.nextUrl.searchParams.get("merge") === "true";

  const result = await importSnapshot({
    dbUserId: dbUser.id,
    anonymousId: payload.anonymousId,
    snapshot: payload.snapshot,
    merge,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.code },
      { status: 409 },
    );
  }

  const snapshot = await getSnapshot(dbUser.id);
  return NextResponse.json({ data: snapshot });
});

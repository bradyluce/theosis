import "server-only";

// Tiny helpers shared by every /api/me/** route handler. Keeps each route
// file to the essential 1-2 lines of business logic by pulling out the
// boilerplate (auth, JSON parse + zod validation, error shape).

import { NextResponse, type NextRequest } from "next/server";
import type { ZodTypeAny, z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import type { DbUserRow } from "@/lib/auth/resolve-db-user";

export type WithUserHandler<T> = (
  dbUser: DbUserRow,
  req: NextRequest,
) => Promise<T>;

// Wraps a handler with auth: returns 401 if the user isn't authenticated;
// otherwise invokes the handler with the resolved DB user row.
export function withUser<T>(handler: WithUserHandler<T>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const result = await requireUser();
    if (result.error) return result.error;
    try {
      const data = await handler(result.dbUser, req);
      return NextResponse.json({ data });
    } catch (err) {
      return handleError(err);
    }
  };
}

// Same as withUser but doesn't wrap the response — handler is responsible
// for returning a NextResponse directly (used by DELETEs that want 204,
// or PATCH that needs custom status codes for 409 conflict).
export function withUserResponse(
  handler: (dbUser: DbUserRow, req: NextRequest) => Promise<NextResponse>,
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const result = await requireUser();
    if (result.error) return result.error;
    try {
      return await handler(result.dbUser, req);
    } catch (err) {
      return handleError(err);
    }
  };
}

// Parses + validates a JSON body. Returns the parsed object or throws a
// BadRequestError the wrapper turns into a 400.
export async function readJson<Schema extends ZodTypeAny>(
  req: NextRequest,
  schema: Schema,
): Promise<z.infer<Schema>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new BadRequestError("invalid_json");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new BadRequestError("validation_failed", parsed.error.issues);
  }
  return parsed.data;
}

export class BadRequestError extends Error {
  constructor(
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(code);
    this.name = "BadRequestError";
  }
}

export class ConflictError extends Error {
  constructor(
    public readonly code: string,
    public readonly current?: unknown,
  ) {
    super(code);
    this.name = "ConflictError";
  }
}

function handleError(err: unknown): NextResponse {
  if (err instanceof BadRequestError) {
    return NextResponse.json(
      { error: err.code, details: err.details },
      { status: 400 },
    );
  }
  if (err instanceof ConflictError) {
    return NextResponse.json(
      { error: err.code, current: err.current },
      { status: 409 },
    );
  }
  console.error("[/api/me] unexpected error:", err);
  return NextResponse.json({ error: "internal_error" }, { status: 500 });
}

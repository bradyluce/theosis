// Authed user-data API client. Shared between web (where the host adds the
// Clerk session cookie automatically) and mobile (where the caller injects
// `Authorization: Bearer <clerk-jwt>` via `fetchImpl`).
//
// Commit 2 ships the read-only methods. Write methods (POST/PUT/DELETE per
// entity + the import endpoint) land in commit 3.

import { meSnapshotDto, userProfileDto, type MeSnapshotDto, type UserProfileDto } from "./me-dtos";

export type TheosisMeApiOptions = {
  // Absolute base URL. Web defaults to "" (same-origin); mobile passes the
  // resolved Vercel URL.
  baseUrl?: string;
  // Inject auth header. Mobile passes a wrapper that reads the Clerk JWT
  // from secure storage and sets `Authorization: Bearer <token>`.
  fetchImpl?: typeof fetch;
};

export type TheosisMeApi = {
  fetchSnapshot: () => Promise<MeSnapshotDto>;
  fetchProfile: () => Promise<UserProfileDto>;
};

export function createTheosisMeApi(
  opts: TheosisMeApiOptions = {},
): TheosisMeApi {
  const baseUrl = opts.baseUrl ?? "";
  const fetchImpl = opts.fetchImpl ?? fetch;

  async function getJson<T>(path: string, parse: (raw: unknown) => T): Promise<T> {
    const res = await fetchImpl(`${baseUrl}${path}`, {
      method: "GET",
      // Same-origin sends Clerk session cookies; cross-origin (mobile) sends
      // the Authorization header from fetchImpl.
      credentials: "include",
    });
    if (!res.ok) {
      throw new TheosisMeApiError(res.status, await safeText(res));
    }
    const body = (await res.json()) as { data: unknown };
    return parse(body.data);
  }

  return {
    fetchSnapshot: () =>
      getJson("/api/me", (raw) => meSnapshotDto.parse(raw)),
    fetchProfile: () =>
      getJson("/api/me/profile", (raw) => userProfileDto.parse(raw)),
  };
}

export class TheosisMeApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly bodyText: string,
  ) {
    super(`Theosis /api/me request failed: ${status} ${bodyText}`);
    this.name = "TheosisMeApiError";
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

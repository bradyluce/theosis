// Authed user-data API client. Shared between web (where the host adds the
// Clerk session cookie automatically) and mobile (where the caller injects
// `Authorization: Bearer <clerk-jwt>` via `fetchImpl`).

import {
  contentCompletionDto,
  favoritePersonDto,
  highlightDto,
  meSnapshotDto,
  noteDto,
  prayerRuleDto,
  readingHistoryEntryDto,
  readingListItemDto,
  recentSearchDto,
  savedVerseDto,
  userProfileDto,
  type ContentCompletionDto,
  type CreateCompletionInput,
  type CreateFavoritePersonInput,
  type CreateReadingHistoryInput,
  type CreateRecentSearchInput,
  type CreateSavedVerseInput,
  type FavoritePersonDto,
  type HighlightDto,
  type ImportPayloadDto,
  type MeSnapshotDto,
  type NoteDto,
  type PrayerRuleDto,
  type ReadingHistoryEntryDto,
  type ReadingListItemDto,
  type RecentSearchDto,
  type ReplacePrayerRuleInput,
  type SavedVerseDto,
  type UpdateProfileInput,
  type UpsertHighlightInput,
  type UpsertNoteInput,
  type UpsertReadingListInput,
  type UserProfileDto,
} from "./me-dtos";

export type TheosisMeApiOptions = {
  // Absolute base URL. Web defaults to "" (same-origin); mobile passes the
  // resolved Vercel URL.
  baseUrl?: string;
  // Inject auth header. Mobile passes a wrapper that reads the Clerk JWT
  // from secure storage and sets `Authorization: Bearer <token>`.
  fetchImpl?: typeof fetch;
  // Credentials mode for the underlying fetch. Web uses "include" so the
  // Clerk session cookie rides along. RN's fetch ignores cookies on iOS
  // and has historically had intermittent issues when "include" is
  // combined with a Bearer header on Hermes — mobile should pass "omit"
  // and authenticate purely via the Authorization header.
  credentials?: "omit" | "same-origin" | "include";
};

export type TheosisMeApi = {
  // --- Read --------------------------------------------------------------
  fetchSnapshot: () => Promise<MeSnapshotDto>;
  fetchProfile: () => Promise<UserProfileDto>;

  // --- Profile -----------------------------------------------------------
  patchProfile: (input: UpdateProfileInput) => Promise<UserProfileDto>;

  // --- Saved verses ------------------------------------------------------
  createSavedVerse: (input: CreateSavedVerseInput) => Promise<SavedVerseDto>;
  deleteSavedVerse: (clientId: string) => Promise<void>;

  // --- Highlights --------------------------------------------------------
  upsertHighlight: (input: UpsertHighlightInput) => Promise<HighlightDto>;
  deleteHighlight: (clientId: string) => Promise<void>;

  // --- Notes -------------------------------------------------------------
  // PUT semantics with optimistic concurrency. 409 surfaces via thrown
  // TheosisMeApiError (status 409, bodyText contains the conflicting row).
  upsertNote: (input: UpsertNoteInput) => Promise<NoteDto>;
  deleteNote: (clientId: string) => Promise<void>;

  // --- Favorite people ---------------------------------------------------
  createFavoritePerson: (
    input: CreateFavoritePersonInput,
  ) => Promise<FavoritePersonDto>;
  deleteFavoritePerson: (clientId: string) => Promise<void>;

  // --- Reading list ------------------------------------------------------
  upsertReadingList: (
    input: UpsertReadingListInput,
  ) => Promise<ReadingListItemDto>;
  deleteReadingListItem: (clientId: string) => Promise<void>;

  // --- Recent searches ---------------------------------------------------
  createRecentSearch: (
    input: CreateRecentSearchInput,
  ) => Promise<RecentSearchDto>;
  clearRecentSearches: () => Promise<void>;

  // --- Reading history ---------------------------------------------------
  createReadingHistoryEntry: (
    input: CreateReadingHistoryInput,
  ) => Promise<ReadingHistoryEntryDto>;

  // --- Prayer rule -------------------------------------------------------
  replacePrayerRule: (
    input: ReplacePrayerRuleInput,
  ) => Promise<PrayerRuleDto>;

  // --- Activity days -----------------------------------------------------
  recordActivityDay: (day: string) => Promise<string[]>;

  // --- Content completions ----------------------------------------------
  createCompletion: (
    input: CreateCompletionInput,
  ) => Promise<ContentCompletionDto>;

  // --- Anonymous-to-authed import ----------------------------------------
  postImport: (
    payload: ImportPayloadDto,
    opts?: { merge?: boolean },
  ) => Promise<MeSnapshotDto>;

  // --- Account deletion -------------------------------------------------
  // Deletes the user row in Postgres (cascades to all related tables).
  // The caller is responsible for calling Clerk's signOut afterwards.
  deleteAccount: () => Promise<void>;
};

export function createTheosisMeApi(
  opts: TheosisMeApiOptions = {},
): TheosisMeApi {
  const baseUrl = opts.baseUrl ?? "";
  const fetchImpl = opts.fetchImpl ?? fetch;
  // Default to "include" so existing web call sites continue sending the
  // Clerk session cookie unchanged. Mobile explicitly passes "omit".
  const credentials: "omit" | "same-origin" | "include" = opts.credentials ?? "include";

  async function request<T>(
    method: string,
    path: string,
    body: unknown,
    parse?: (raw: unknown) => T,
  ): Promise<T> {
    const init: RequestInit = {
      method,
      credentials,
      headers: body !== undefined ? { "Content-Type": "application/json" } : {},
      body: body !== undefined ? JSON.stringify(body) : undefined,
    };
    const res = await fetchImpl(`${baseUrl}${path}`, init);
    if (res.status === 204) {
      // DELETE — no body, nothing to parse.
      return undefined as T;
    }
    if (!res.ok) {
      throw new TheosisMeApiError(res.status, await safeText(res));
    }
    if (!parse) {
      return undefined as T;
    }
    const json = (await res.json()) as { data: unknown };
    return parse(json.data);
  }

  return {
    fetchSnapshot: () =>
      request("GET", "/api/me", undefined, (raw) => meSnapshotDto.parse(raw)),
    fetchProfile: () =>
      request("GET", "/api/me/profile", undefined, (raw) =>
        userProfileDto.parse(raw),
      ),

    patchProfile: (input) =>
      request("PATCH", "/api/me/profile", input, (raw) =>
        userProfileDto.parse(raw),
      ),

    createSavedVerse: (input) =>
      request("POST", "/api/me/saved-verses", input, (raw) =>
        savedVerseDto.parse(raw),
      ),
    deleteSavedVerse: (clientId) =>
      request("DELETE", `/api/me/saved-verses/${encodeURIComponent(clientId)}`, undefined),

    upsertHighlight: (input) =>
      request("PUT", "/api/me/highlights", input, (raw) =>
        highlightDto.parse(raw),
      ),
    deleteHighlight: (clientId) =>
      request("DELETE", `/api/me/highlights/${encodeURIComponent(clientId)}`, undefined),

    upsertNote: (input) =>
      request("PUT", "/api/me/notes", input, (raw) => noteDto.parse(raw)),
    deleteNote: (clientId) =>
      request("DELETE", `/api/me/notes/${encodeURIComponent(clientId)}`, undefined),

    createFavoritePerson: (input) =>
      request("POST", "/api/me/favorite-people", input, (raw) =>
        favoritePersonDto.parse(raw),
      ),
    deleteFavoritePerson: (clientId) =>
      request(
        "DELETE",
        `/api/me/favorite-people/${encodeURIComponent(clientId)}`,
        undefined,
      ),

    upsertReadingList: (input) =>
      request("PUT", "/api/me/reading-list", input, (raw) =>
        readingListItemDto.parse(raw),
      ),
    deleteReadingListItem: (clientId) =>
      request(
        "DELETE",
        `/api/me/reading-list/${encodeURIComponent(clientId)}`,
        undefined,
      ),

    createRecentSearch: (input) =>
      request("POST", "/api/me/recent-searches", input, (raw) =>
        recentSearchDto.parse(raw),
      ),
    clearRecentSearches: () =>
      request("DELETE", "/api/me/recent-searches", undefined),

    deleteAccount: () => request("DELETE", "/api/me", undefined),

    createReadingHistoryEntry: (input) =>
      request("POST", "/api/me/reading-history", input, (raw) =>
        readingHistoryEntryDto.parse(raw),
      ),

    replacePrayerRule: (input) =>
      request("PUT", "/api/me/prayer-rule", input, (raw) =>
        prayerRuleDto.parse(raw),
      ),

    recordActivityDay: (day) =>
      request("POST", "/api/me/activity-days", { day }, (raw) =>
        (raw as string[]) /* server returns string[] directly */,
      ),

    createCompletion: (input) =>
      request("POST", "/api/me/completions", input, (raw) =>
        contentCompletionDto.parse(raw),
      ),

    postImport: (payload, options) => {
      const qs = options?.merge ? "?merge=true" : "";
      return request("POST", `/api/me/import${qs}`, payload, (raw) =>
        meSnapshotDto.parse(raw),
      );
    },
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

// Typed HTTP client for the Theosis content API. Used by the mobile app to
// reach `/api/*` routes on the Next.js web app (in dev) or the deployed
// Vercel URL (in prod). The web app itself doesn't use this — it reads
// catalogs and files directly from disk via the server-side loader.
//
// Caller provides the baseUrl when constructing the client:
//
//   const api = createTheosisApi({ baseUrl: "http://localhost:3000" });
//   const version = await api.fetchVersion();
//
// Each fetch returns the response body parsed as the matching type, or
// throws `ApiError` on a non-2xx response or network failure. The client is
// thin on purpose — wrap calls with React Query / TanStack Query for
// caching, retries, and stale-while-revalidate behavior on the client.

import type {
  ByChapterFile,
  ByVerseFile,
  ByWorkFile,
  CommentaryCatalog,
  LibraryCatalog,
  VersionResponse,
} from "./types";

export class ApiError extends Error {
  readonly status: number;
  readonly url: string;
  constructor(message: string, url: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.url = url;
  }
}

export type TheosisApiOptions = {
  baseUrl: string;
  // Optional fetch override for testing or custom networking.
  fetchImpl?: typeof fetch;
};

export type TheosisApi = {
  fetchVersion: () => Promise<VersionResponse>;
  fetchCommentaryCatalog: () => Promise<CommentaryCatalog>;
  fetchLibraryCatalog: () => Promise<LibraryCatalog>;
  fetchVerseCommentary: (
    bookSlug: string,
    chapterNumber: number,
    verseNumber: number,
  ) => Promise<ByVerseFile>;
  fetchChapterCommentary: (
    bookSlug: string,
    chapterNumber: number,
  ) => Promise<ByChapterFile>;
  fetchWorkChapter: (workId: string, order: number) => Promise<ByWorkFile>;
};

export function createTheosisApi(options: TheosisApiOptions): TheosisApi {
  const base = options.baseUrl.replace(/\/+$/, "");
  const doFetch = options.fetchImpl ?? fetch;

  async function getJson<T>(path: string): Promise<T> {
    const url = `${base}${path}`;
    let response: Response;
    try {
      response = await doFetch(url);
    } catch (cause) {
      throw new ApiError(`network error: ${(cause as Error).message}`, url, 0);
    }
    if (!response.ok) {
      throw new ApiError(
        `HTTP ${response.status} ${response.statusText}`,
        url,
        response.status,
      );
    }
    return (await response.json()) as T;
  }

  return {
    fetchVersion: () => getJson<VersionResponse>("/api/version"),
    fetchCommentaryCatalog: () =>
      getJson<CommentaryCatalog>("/api/commentary/catalog"),
    fetchLibraryCatalog: () => getJson<LibraryCatalog>("/api/library/catalog"),
    fetchVerseCommentary: (bookSlug, chapterNumber, verseNumber) =>
      getJson<ByVerseFile>(
        `/api/commentary/by-verse/${encodeURIComponent(bookSlug)}/${chapterNumber}/${verseNumber}`,
      ),
    fetchChapterCommentary: (bookSlug, chapterNumber) =>
      getJson<ByChapterFile>(
        `/api/commentary/by-chapter/${encodeURIComponent(bookSlug)}/${chapterNumber}`,
      ),
    fetchWorkChapter: (workId, order) =>
      getJson<ByWorkFile>(
        `/api/library/by-work/${encodeURIComponent(workId)}/${order}`,
      ),
  };
}

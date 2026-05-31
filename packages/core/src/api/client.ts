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
  BibleCatalog,
  BibleChapterFile,
  ByChapterFile,
  ByVerseFile,
  ByWorkFile,
  CommentaryCatalog,
  DailyResponse,
  FathersSearchResponse,
  GeocodeResponse,
  GuidePageResponse,
  GuidesResponse,
  LibraryCatalog,
  LibraryPeopleResponse,
  LibraryTimelineResponse,
  MenaionMonthResponse,
  MonasteriesNearResponse,
  MonasteryDetailResponse,
  ParishDetailResponse,
  ParishesNearResponse,
  ReadingPlanResponse,
  ReadingPlansResponse,
  SearchResponse,
  TopicPageResponse,
  TopicsResponse,
  VersionResponse,
  WorkChaptersResponse,
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
  // `isoDate` is optional — omit for today, pass "YYYY-MM-DD" for a specific
  // calendar date (e.g. peeking at a feast next week). `options.calendarSystem`
  // ("new" = Revised Julian default, "old" = Julian) shifts fixed-feast dates;
  // `options.jurisdiction` is an Assembly code used only to label the result.
  fetchDaily: (
    isoDate?: string,
    options?: { calendarSystem?: "new" | "old"; jurisdiction?: string },
  ) => Promise<DailyResponse>;
  fetchCommentaryCatalog: () => Promise<CommentaryCatalog>;
  fetchLibraryCatalog: () => Promise<LibraryCatalog>;
  fetchLibraryPeople: () => Promise<LibraryPeopleResponse>;
  fetchBibleCatalog: () => Promise<BibleCatalog>;
  fetchBibleChapter: (
    translationId: string,
    bookSlug: string,
    chapterNumber: number,
  ) => Promise<BibleChapterFile>;
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
  fetchWorkChapters: (workId: string) => Promise<WorkChaptersResponse>;
  fetchTopics: () => Promise<TopicsResponse>;
  fetchTopic: (slug: string) => Promise<TopicPageResponse>;
  fetchGuides: () => Promise<GuidesResponse>;
  fetchGuide: (slug: string) => Promise<GuidePageResponse>;
  // `month` is 1-12.
  fetchMenaionMonth: (month: number) => Promise<MenaionMonthResponse>;
  search: (query: string) => Promise<SearchResponse>;
  // "Ask the Fathers" — semantic retrieval over the patristic corpus.
  // Retrieval-only: ranked real writings, never a generated answer.
  searchFathers: (query: string) => Promise<FathersSearchResponse>;
  // Parishes within `radiusMi` (default 50) of (lat, lng), sorted by
  // distance ascending. Optional `jurisdictions` is a list of codes
  // (goa, oca, ant, ...) — when set, only matches are returned.
  fetchParishesNear: (params: {
    lat: number;
    lng: number;
    radiusMi?: number;
    limit?: number;
    jurisdictions?: string[];
  }) => Promise<ParishesNearResponse>;
  // Full parish detail by state code (2-letter, e.g. "ny") + slug.
  fetchParishDetail: (state: string, slug: string) => Promise<ParishDetailResponse>;
  // Forward-geocode a ZIP, city, or address to lat/lng. Used as a manual
  // fallback on the parishes/monasteries screens when location is denied.
  geocode: (query: string) => Promise<GeocodeResponse>;
  // Monasteries within `radiusMi` (default 50) of (lat, lng), sorted by
  // distance ascending. Optional `jurisdictions` (goa, oca, ...) and
  // `communityTypes` (male, female, mixed) narrow the results when set.
  fetchMonasteriesNear: (params: {
    lat: number;
    lng: number;
    radiusMi?: number;
    limit?: number;
    jurisdictions?: string[];
    communityTypes?: string[];
  }) => Promise<MonasteriesNearResponse>;
  // Full monastery detail by state code (2-letter) + slug.
  fetchMonasteryDetail: (
    state: string,
    slug: string,
  ) => Promise<MonasteryDetailResponse>;
  // Reading plans — static editorial content, no per-user data here.
  // Progress lives in the client's profile store.
  fetchReadingPlans: () => Promise<ReadingPlansResponse>;
  fetchReadingPlan: (slug: string) => Promise<ReadingPlanResponse>;
  // Patristic timeline — every catalogued Person with a parseable era,
  // already bucketed (year resolved server-side, icon URL absolute).
  fetchLibraryTimeline: () => Promise<LibraryTimelineResponse>;
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
    fetchDaily: (isoDate, options) => {
      const params = new URLSearchParams();
      if (isoDate) params.set("date", isoDate);
      if (options?.calendarSystem) params.set("calendar", options.calendarSystem);
      if (options?.jurisdiction) params.set("jurisdiction", options.jurisdiction);
      const query = params.toString();
      return getJson<DailyResponse>(query ? `/api/daily?${query}` : "/api/daily");
    },
    fetchCommentaryCatalog: () =>
      getJson<CommentaryCatalog>("/api/commentary/catalog"),
    fetchLibraryCatalog: () => getJson<LibraryCatalog>("/api/library/catalog"),
    fetchLibraryPeople: () =>
      getJson<LibraryPeopleResponse>("/api/library/people"),
    fetchBibleCatalog: () => getJson<BibleCatalog>("/api/bible/catalog"),
    fetchBibleChapter: (translationId, bookSlug, chapterNumber) =>
      getJson<BibleChapterFile>(
        `/api/bible/${encodeURIComponent(translationId)}/${encodeURIComponent(bookSlug)}/${chapterNumber}`,
      ),
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
    fetchWorkChapters: (workId) =>
      getJson<WorkChaptersResponse>(
        `/api/library/by-work/${encodeURIComponent(workId)}/chapters`,
      ),
    fetchTopics: () => getJson<TopicsResponse>("/api/topics"),
    fetchTopic: (slug) =>
      getJson<TopicPageResponse>(`/api/topics/${encodeURIComponent(slug)}`),
    fetchGuides: () => getJson<GuidesResponse>("/api/guides"),
    fetchGuide: (slug) =>
      getJson<GuidePageResponse>(`/api/guides/${encodeURIComponent(slug)}`),
    fetchMenaionMonth: (month) =>
      getJson<MenaionMonthResponse>(`/api/calendar/menaion-month/${month}`),
    search: (query) =>
      getJson<SearchResponse>(`/api/search?q=${encodeURIComponent(query)}`),
    searchFathers: (query) =>
      getJson<FathersSearchResponse>(
        `/api/search/fathers?q=${encodeURIComponent(query)}`,
      ),
    fetchParishesNear: ({ lat, lng, radiusMi, limit, jurisdictions }) => {
      const params = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
      });
      if (radiusMi !== undefined) params.set("radius", String(radiusMi));
      if (limit !== undefined) params.set("limit", String(limit));
      if (jurisdictions && jurisdictions.length > 0) {
        params.set("jurisdictions", jurisdictions.join(","));
      }
      return getJson<ParishesNearResponse>(`/api/parishes/near?${params.toString()}`);
    },
    fetchParishDetail: (state, slug) =>
      getJson<ParishDetailResponse>(
        `/api/parishes/${encodeURIComponent(state.toLowerCase())}/${encodeURIComponent(slug)}`,
      ),
    geocode: (query) =>
      getJson<GeocodeResponse>(
        `/api/parishes/geocode?q=${encodeURIComponent(query)}`,
      ),
    fetchMonasteriesNear: ({
      lat,
      lng,
      radiusMi,
      limit,
      jurisdictions,
      communityTypes,
    }) => {
      const params = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
      });
      if (radiusMi !== undefined) params.set("radius", String(radiusMi));
      if (limit !== undefined) params.set("limit", String(limit));
      if (jurisdictions && jurisdictions.length > 0) {
        params.set("jurisdictions", jurisdictions.join(","));
      }
      if (communityTypes && communityTypes.length > 0) {
        params.set("community", communityTypes.join(","));
      }
      return getJson<MonasteriesNearResponse>(
        `/api/monasteries/near?${params.toString()}`,
      );
    },
    fetchMonasteryDetail: (state, slug) =>
      getJson<MonasteryDetailResponse>(
        `/api/monasteries/${encodeURIComponent(state.toLowerCase())}/${encodeURIComponent(slug)}`,
      ),
    fetchReadingPlans: () =>
      getJson<ReadingPlansResponse>("/api/reading-plans"),
    fetchReadingPlan: (slug) =>
      getJson<ReadingPlanResponse>(
        `/api/reading-plans/${encodeURIComponent(slug)}`,
      ),
    fetchLibraryTimeline: () =>
      getJson<LibraryTimelineResponse>("/api/library/timeline"),
  };
}

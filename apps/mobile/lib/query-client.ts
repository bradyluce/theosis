import { QueryClient } from "@tanstack/react-query";

// Single QueryClient instance for the app. Created once at module load so
// React Query's caches survive across screen re-mounts. Default options
// align with a content app where most data is stable for the session:
// - retry once on failure (transient network blips are common on mobile)
// - 5 min staleTime so screens don't refetch on every focus
// - 30 min gcTime so navigating away briefly doesn't drop the cache
//
// Per-query overrides can tighten these for fast-moving data (e.g.
// /api/version should be staleTime: 60s).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

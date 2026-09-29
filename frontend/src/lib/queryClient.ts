import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";

import { ApiError } from "../api/client";

/**
 * Shared by the app and the tests. Any 401 (e.g. the session expired while an
 * admin page was open) re-checks "me", so RequireAdmin sends the user to the
 * login page instead of leaving a broken screen.
 */
export function createQueryClient(options: { retry?: boolean } = {}) {
  const client: QueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: options.retry === false ? false : 1,
      },
    },
    queryCache: new QueryCache({ onError: (error, query) => on401(error, query.queryKey) }),
    mutationCache: new MutationCache({ onError: (error) => on401(error) }),
  });

  function on401(error: unknown, queryKey?: readonly unknown[]) {
    // "me" answering 401 is normal (not logged in); don't loop on it.
    if (error instanceof ApiError && error.status === 401 && queryKey?.[0] !== "me") {
      client.invalidateQueries({ queryKey: ["me"] });
    }
  }
  return client;
}

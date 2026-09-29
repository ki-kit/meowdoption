import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchCat, fetchCats, type CatFilters } from "../api/cats";
import { ApiError } from "../api/client";

export function useCats(filters: CatFilters) {
  return useQuery({
    queryKey: ["cats", filters],
    queryFn: () => fetchCats(filters),
    // Keep showing the old list while a new filter loads (no flash).
    placeholderData: keepPreviousData,
  });
}

export function useCat(id: number) {
  return useQuery({
    queryKey: ["cat", id],
    queryFn: () => fetchCat(id),
    enabled: Number.isInteger(id),
    // A 404 won't fix itself, so show "not found" right away.
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 1,
  });
}

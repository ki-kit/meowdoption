import type { CatFilters, CatStatus, Sex } from "../api/cats";

const SEXES: Sex[] = ["male", "female"];
const STATUSES: CatStatus[] = ["available", "pending", "adopted"];
const BOOL_KEYS = ["castrated", "good_with_kids", "good_with_cats", "good_with_dogs"] as const;

function pick<T extends string>(value: string | null, allowed: T[]): T | undefined {
  return allowed.find((a) => a === value);
}

function bool(value: string | null): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

/** URL query -> API filters. Junk values (hand-edited URLs) are dropped, not sent. */
export function filtersFromParams(params: URLSearchParams): CatFilters {
  const filters: CatFilters = {
    sex: pick(params.get("sex"), SEXES),
    status: pick(params.get("status"), STATUSES),
  };
  for (const key of BOOL_KEYS) filters[key] = bool(params.get(key));
  const page = Number(params.get("page"));
  if (Number.isInteger(page) && page > 1) filters.page = page;
  return filters;
}

/** API filters -> URL query; unset filters leave no trace in the URL. */
export function paramsFromFilters(filters: CatFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined) params.set(key, String(value));
  }
  return params;
}

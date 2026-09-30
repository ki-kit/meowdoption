import { apiGet } from "./client";
import type { components } from "./schema";

// Generated from the API's OpenAPI schema (npm run gen:api), never hand-written.
type Schemas = components["schemas"];
export type Sex = Schemas["Sex"];
export type CatStatus = Schemas["CatStatus"];
export type Photo = Schemas["PhotoRead"];
export type Sound = Schemas["SoundRead"];
export type Cat = Schemas["CatRead"];
export type CatPage = Schemas["CatPage"];

// Same names as the API query params, so URL <-> API is a straight copy.
export interface CatFilters {
  sex?: Sex;
  castrated?: boolean;
  status?: CatStatus;
  good_with_kids?: boolean;
  good_with_cats?: boolean;
  good_with_dogs?: boolean;
  page?: number;
}

export const PAGE_SIZE = 12;

export function fetchCats(filters: CatFilters): Promise<CatPage> {
  const params = new URLSearchParams({ size: String(PAGE_SIZE) });
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined) params.set(key, String(value));
  }
  return apiGet<CatPage>(`/cats?${params}`);
}

export function fetchCat(id: number): Promise<Cat> {
  return apiGet<Cat>(`/cats/${id}`);
}

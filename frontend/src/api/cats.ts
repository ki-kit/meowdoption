import { apiGet } from "./client";

// Mirrors backend app/schemas/cat.py (CatRead / CatPage).
export type Sex = "male" | "female";
export type CatStatus = "available" | "pending" | "adopted";

export interface Cat {
  id: number;
  name: string;
  age_months: number;
  sex: Sex;
  breed: string;
  description: string;
  castrated: boolean;
  status: CatStatus;
  good_with_kids: boolean;
  good_with_cats: boolean;
  good_with_dogs: boolean;
  created_at: string;
  updated_at: string;
}

export interface CatPage {
  items: Cat[];
  total: number;
  page: number;
  size: number;
}

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

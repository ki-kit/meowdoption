import { apiGet } from "./client";

// Mirrors backend app/schemas/cat.py (CatRead / CatPage).
export type Sex = "male" | "female";
export type CatStatus = "available" | "pending" | "adopted";

export interface Photo {
  id: number;
  url: string;
  is_primary: boolean;
  width: number;
  height: number;
}

export interface Sound {
  id: number;
  url: string;
  content_type: string;
  is_primary: boolean;
  duration_s: number | null;
}

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
  photos: Photo[];
  sounds: Sound[];
  primary_photo_url: string | null;
  /** Always set: cats without their own sound get the default meow. */
  primary_sound_url: string;
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

import type { HousingType } from "./applications";
import type { Cat, CatStatus, Photo, Sex, Sound } from "./cats";
import { apiDelete, apiGet, apiPatch, apiPost, apiUpload } from "./client";

// Mirrors backend app/schemas (CatCreate / ApplicationRead / ApplicationPage).
export interface CatInput {
  name: string;
  sex: Sex;
  age_months: number;
  breed: string;
  description: string;
  castrated: boolean;
  status: CatStatus;
  good_with_kids: boolean;
  good_with_cats: boolean;
  good_with_dogs: boolean;
}

export type ApplicationStatus = "new" | "approved" | "rejected";

export interface AdminApplication {
  id: number;
  cat: { id: number; name: string; status: CatStatus };
  full_name: string;
  email: string;
  phone: string;
  message: string;
  housing_type: HousingType;
  has_other_pets: boolean;
  status: ApplicationStatus;
  created_at: string;
}

export interface ApplicationPage {
  items: AdminApplication[];
  total: number;
  page: number;
  size: number;
}

export interface ApplicationFilters {
  status?: ApplicationStatus;
  cat_id?: number;
  page?: number;
}

export const APPLICATIONS_PAGE_SIZE = 20;

export const createCat = (data: CatInput) => apiPost<Cat>("/cats", data);
export const updateCat = (id: number, changes: Partial<CatInput>) =>
  apiPatch<Cat>(`/cats/${id}`, changes);
export const deleteCat = (id: number) => apiDelete(`/cats/${id}`);

export function fetchApplications(filters: ApplicationFilters): Promise<ApplicationPage> {
  const params = new URLSearchParams({ size: String(APPLICATIONS_PAGE_SIZE) });
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined) params.set(key, String(value));
  }
  return apiGet<ApplicationPage>(`/applications?${params}`);
}

export const setApplicationStatus = (id: number, status: ApplicationStatus) =>
  apiPatch<AdminApplication>(`/applications/${id}`, { status });

// --- Media ---------------------------------------------------------------------

export type MediaKind = "photos" | "sounds";

// Same limits as the backend (app/services/media.py); checked here first so
// the admin gets instant feedback instead of waiting for a big upload.
export const MEDIA_RULES = {
  photos: { maxBytes: 5 * 1024 * 1024, accept: "image/jpeg,image/png,image/webp", label: "JPEG, PNG or WebP, max 5 MB" },
  sounds: { maxBytes: 1 * 1024 * 1024, accept: "audio/mpeg,audio/ogg,audio/wav,.mp3,.ogg,.wav", label: "MP3, OGG or WAV, max 1 MB" },
} as const;

export const uploadMedia = (kind: MediaKind, catId: number, file: File) =>
  apiUpload<Photo | Sound>(`/cats/${catId}/${kind}`, file);
export const makeMediaPrimary = (kind: MediaKind, id: number) =>
  apiPatch<Photo | Sound>(`/${kind}/${id}`, { is_primary: true });
export const deleteMedia = (kind: MediaKind, id: number) => apiDelete(`/${kind}/${id}`);

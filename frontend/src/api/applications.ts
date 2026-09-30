import { apiPost } from "./client";

// Mirrors backend app/schemas/application.py.
export type HousingType = "apartment" | "house" | "house_with_garden";

export const HOUSING_LABEL: Record<HousingType, string> = {
  apartment: "Apartment",
  house: "House",
  house_with_garden: "House with a garden",
};

export interface ApplicationCreate {
  full_name: string;
  email: string;
  phone: string;
  message: string;
  housing_type: HousingType;
  has_other_pets: boolean;
}

export interface ApplicationReceipt {
  id: number;
  cat_id: number;
  status: "new" | "approved" | "rejected";
  created_at: string;
}

export function submitApplication(catId: number, data: ApplicationCreate) {
  return apiPost<ApplicationReceipt>(`/cats/${catId}/applications`, data);
}

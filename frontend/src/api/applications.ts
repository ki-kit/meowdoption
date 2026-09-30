import { apiPost } from "./client";
import type { components } from "./schema";

// Generated from the API's OpenAPI schema (npm run gen:api).
export type HousingType = components["schemas"]["HousingType"];
export type ApplicationCreate = components["schemas"]["ApplicationCreate"];
export type ApplicationReceipt = components["schemas"]["ApplicationReceipt"];

export const HOUSING_LABEL: Record<HousingType, string> = {
  apartment: "Apartment",
  house: "House",
  house_with_garden: "House with a garden",
};

export function submitApplication(catId: number, data: ApplicationCreate) {
  return apiPost<ApplicationReceipt>(`/cats/${catId}/applications`, data);
}

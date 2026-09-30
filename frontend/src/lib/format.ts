import type { CatStatus, Sex } from "../api/cats";

export function formatAge(months: number): string {
  if (months < 12) return months === 1 ? "1 month" : `${months} months`;
  const years = Math.floor(months / 12);
  return years === 1 ? "1 year" : `${years} years`;
}

export const SEX_LABEL: Record<Sex, string> = { male: "♂ Male", female: "♀ Female" };

export const STATUS_LABEL: Record<CatStatus, string> = {
  available: "Available",
  pending: "Adoption pending",
  adopted: "Adopted",
};

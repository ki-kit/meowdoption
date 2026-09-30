import { z } from "zod";

import type { HousingType } from "../api/applications";

const HOUSING: [HousingType, ...HousingType[]] = ["apartment", "house", "house_with_garden"];

// Same rules as the backend (app/schemas/application.py) so users see errors
// instantly; the server still validates everything.
export const applicationSchema = z.object({
  full_name: z.string().trim().min(1, "Please enter your name").max(100, "Max 100 characters"),
  email: z
    .string()
    .trim()
    .min(1, "Please enter your email")
    .max(254, "That email is too long")
    .pipe(z.email("Please enter a valid email address")),
  phone: z
    .string()
    .trim()
    .max(30, "Max 30 characters")
    .regex(/^[0-9+()\s-]*$/, "Only digits, spaces and + ( ) -"),
  housing_type: z.enum(HOUSING, "Please choose your housing"),
  has_other_pets: z.boolean(),
  message: z.string().trim().max(2000, "Max 2000 characters"),
});

export type ApplicationForm = z.infer<typeof applicationSchema>;

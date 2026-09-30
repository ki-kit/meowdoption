import { z } from "./zod";

// Same limits as the backend (app/schemas/cat.py CatCreate).
export const catSchema = z.object({
  name: z.string().trim().min(1, "Please enter a name").max(100, "Max 100 characters"),
  sex: z.enum(["male", "female"], "Please choose the sex"),
  // valueAsNumber turns an empty input into NaN, which fails this check.
  age_months: z
    .number("Please enter the age in months")
    .int("Whole months only")
    .min(0, "Age can't be negative")
    .max(360, "That's older than any cat (max 360 months)"),
  breed: z.string().trim().max(100, "Max 100 characters"),
  description: z.string().trim().max(5000, "Max 5000 characters"),
  castrated: z.boolean(),
  status: z.enum(["available", "pending", "adopted"]),
  good_with_kids: z.boolean(),
  good_with_cats: z.boolean(),
  good_with_dogs: z.boolean(),
});

export type CatFormValues = z.infer<typeof catSchema>;

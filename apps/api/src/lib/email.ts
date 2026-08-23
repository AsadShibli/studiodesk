import { z } from "zod";

// Allows demo addresses like owner@demo as well as real emails.
export const emailSchema = z
  .string()
  .min(3)
  .refine((v) => v.includes("@"), "Invalid email");

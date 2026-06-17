import { z } from "zod";

// Coerce optional text inputs: empty strings become undefined so optional
// fields aren't stored as "".
const optionalString = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .transform((v) => (v ? v : undefined));

const shortOptionalString = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((v) => (v ? v : undefined));

// Optional non-negative integer from a form field (string | undefined).
const optionalInt = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === "" || v === null) return undefined;
    const n = typeof v === "number" ? v : Number(v.replace(/[,$\s]/g, ""));
    return Number.isFinite(n) ? Math.round(n) : NaN;
  })
  .refine((v) => v === undefined || (Number.isFinite(v) && v >= 0), {
    message: "Must be a positive number",
  });

const optionalFloat = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === "" || v === null) return undefined;
    const n = typeof v === "number" ? v : Number(v.replace(/[,$\s]/g, ""));
    return Number.isFinite(n) ? n : NaN;
  })
  .refine((v) => v === undefined || (Number.isFinite(v) && v >= 0), {
    message: "Must be a positive number",
  });

export const signupSchema = z.object({
  name: shortOptionalString,
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(200),
  password: z
    .string()
    .min(8, "Use at least 8 characters")
    .max(200, "Password is too long"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(200),
  password: z.string().min(1, "Enter your password").max(200),
});

export const buyerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z
    .union([z.string().trim().toLowerCase().email("Enter a valid email"), z.literal("")])
    .optional()
    .transform((v) => (v ? v : undefined)),
  phone: shortOptionalString,
  notes: optionalString,
  markets: shortOptionalString,
  propertyTypes: shortOptionalString,
  minPrice: optionalInt,
  maxPrice: optionalInt,
});

export const PROPERTY_TYPES = [
  "Single Family",
  "Multi Family",
  "Condo",
  "Townhouse",
  "Land",
  "Commercial",
  "Mobile/Manufactured",
] as const;

export const DEAL_STATUSES = ["active", "pending", "sold", "archived"] as const;

export const dealSchema = z.object({
  title: shortOptionalString,
  address: z.string().trim().min(1, "Address is required").max(300),
  city: z.string().trim().min(1, "City is required").max(120),
  state: z.string().trim().min(1, "State is required").max(60),
  zip: shortOptionalString,
  propertyType: shortOptionalString,
  askingPrice: optionalInt,
  arv: optionalInt,
  repairEstimate: optionalInt,
  bedrooms: optionalInt,
  bathrooms: optionalFloat,
  sqft: optionalInt,
  description: optionalString,
  status: z.enum(DEAL_STATUSES).default("active"),
});

export type BuyerInput = z.infer<typeof buyerSchema>;
export type DealInput = z.infer<typeof dealSchema>;

// Flatten a ZodError into a simple { field: message } map for the UI.
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username must be at least 3 characters.")
  .max(30, "Username must be 30 characters or fewer.")
  .regex(/^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])$/, "Use letters, numbers, dashes, or underscores.")
  .refine((value) => !value.includes("--"), "Avoid repeated dashes.")
  .refine((value) => !["admin", "api", "auth", "dashboard", "login", "register", "settings", "www"].includes(value), {
    message: "This username is reserved.",
  });

export const httpUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }, "Enter a valid http(s) URL.");

export const optionalHttpUrlSchema = z
  .union([httpUrlSchema, z.literal("")])
  .optional()
  .transform((value) => (value ? normalizeUrl(value) : ""));

export const ctaUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => {
    try {
      if (value.startsWith("mailto:")) return /^mailto:[^@\s]+@[^@\s]+\.[^@\s]+/i.test(value);
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }, "Enter a valid http(s) or mailto URL.");

export const safeTextSchema = (max = 500) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => sanitizeText(value));

export const profileFormSchema = z.object({
  displayName: safeTextSchema(80).pipe(z.string().min(2)),
  username: usernameSchema,
  title: safeTextSchema(120).optional(),
  bio: safeTextSchema(500).optional(),
  location: safeTextSchema(120).optional(),
  website: optionalHttpUrlSchema,
  seoTitle: safeTextSchema(70).optional(),
  seoDescription: safeTextSchema(160).optional(),
  isPublished: z.boolean().optional(),
});

export const linkFormSchema = z.object({
  title: safeTextSchema(80).pipe(z.string().min(1)),
  url: httpUrlSchema.transform(normalizeUrl),
  description: safeTextSchema(180).optional(),
  icon: safeTextSchema(40).optional(),
  type: safeTextSchema(40).optional(),
  position: z.coerce.number().int().min(0).optional(),
  isActive: z.coerce.boolean().optional(),
});

export const projectFormSchema = z.object({
  title: safeTextSchema(100).pipe(z.string().min(1)),
  description: safeTextSchema(800).optional(),
  imageUrl: optionalHttpUrlSchema,
  projectUrl: optionalHttpUrlSchema,
  repoUrl: optionalHttpUrlSchema,
  tags: z.array(safeTextSchema(30)).max(12).default([]),
  position: z.coerce.number().int().min(0).optional(),
  isFeatured: z.coerce.boolean().optional(),
  isActive: z.coerce.boolean().optional(),
});

export const serviceFormSchema = z.object({
  title: safeTextSchema(100).pipe(z.string().min(1)),
  description: safeTextSchema(800).optional(),
  priceLabel: safeTextSchema(80).optional(),
  ctaLabel: safeTextSchema(60).optional(),
  ctaUrl: z.union([ctaUrlSchema, z.literal("")]).optional(),
  position: z.coerce.number().int().min(0).optional(),
  isActive: z.coerce.boolean().optional(),
});

export function sanitizeText(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("mailto:")) return trimmed;

  const url = new URL(trimmed);
  url.hash = "";
  return url.toString();
}

export function isSafeRedirectPath(value: string | null | undefined): value is string {
  return Boolean(value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\"));
}

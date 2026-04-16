import { z } from "zod";

const emptyToUndefined = (value: unknown) => {
  if (value == null) return undefined;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
};

export const appointmentStatusOptions = [
  "requested",
  "confirmed",
  "completed",
  "cancelled",
  "no-show",
] as const;

export const appointmentSourceOptions = ["owner", "customer"] as const;

export const serviceTypeSchema = z.object({
  id: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  name: z.string().trim().min(1, "Service name is required.").max(120),
  description: z.preprocess(emptyToUndefined, z.string().max(1000).optional()),
  duration_minutes: z.coerce.number().int().min(15).max(480),
  requires_approval: z.coerce.boolean().default(false),
  public_booking_enabled: z.coerce.boolean().default(true),
});

export const availabilityRuleSchema = z.object({
  id: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  day_of_week: z.coerce.number().int().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
  is_available: z.coerce.boolean().default(true),
});

export const blockedTimeSchema = z.object({
  id: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  title: z.string().trim().min(1).max(160),
  start_at: z.string().trim().min(1),
  end_at: z.string().trim().min(1),
});

export const appointmentSchema = z.object({
  id: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  service_type_id: z.string().uuid(),
  customer_id: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  vehicle_id: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  title: z.preprocess(emptyToUndefined, z.string().max(160).optional()),
  notes: z.preprocess(emptyToUndefined, z.string().max(4000).optional()),
  status: z.enum(appointmentStatusOptions),
  source: z.enum(appointmentSourceOptions).default("owner"),
  start_at: z.string().trim().min(1),
  end_at: z.string().trim().min(1),
  contact_name: z.preprocess(emptyToUndefined, z.string().max(160).optional()),
  contact_phone: z.preprocess(emptyToUndefined, z.string().max(40).optional()),
  contact_email: z.preprocess(emptyToUndefined, z.email().optional()),
});

export const publicBookingSchema = z.object({
  booking_slug: z.string().trim().min(1),
  service_type_id: z.string().uuid(),
  slot_start_at: z.string().trim().min(1),
  contact_name: z.string().trim().min(1).max(160),
  contact_phone: z.string().trim().min(1).max(40),
  contact_email: z.preprocess(emptyToUndefined, z.email().optional()),
  vehicle_year: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1900).max(2100).optional()),
  vehicle_make: z.preprocess(emptyToUndefined, z.string().max(80).optional()),
  vehicle_model: z.preprocess(emptyToUndefined, z.string().max(80).optional()),
  notes: z.preprocess(emptyToUndefined, z.string().max(4000).optional()),
});

export const bookingSlugSchema = z.object({
  booking_slug: z.string().trim().min(3).max(50).regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens only."),
});

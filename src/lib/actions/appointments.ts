"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { buildAvailableSlots, hasConflict, isWithinAvailability } from "@/lib/schedule";
import {
  appointmentSchema,
  appointmentStatusOptions,
  availabilityRuleSchema,
  blockedTimeSchema,
  bookingSlugSchema,
  publicBookingSchema,
  serviceTypeSchema,
} from "@/lib/validators/appointment";

type AppointmentStatus = (typeof appointmentStatusOptions)[number];

function isAppointmentStatus(value: string): value is AppointmentStatus {
  return appointmentStatusOptions.includes(value as AppointmentStatus);
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Not authenticated");
  }

  return { supabase, user };
}

function revalidateAppointmentRoutes(slug?: string) {
  revalidatePath("/");
  revalidatePath("/appointments");
  if (slug) revalidatePath(`/book/${slug}`);
}

async function ensureAppointmentSlotAvailable({
  supabase,
  userId,
  startAt,
  endAt,
  ignoreAppointmentId,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  startAt: Date;
  endAt: Date;
  ignoreAppointmentId?: string;
}) {
  const [
    { data: rules, error: rulesError },
    { data: blocked, error: blockedError },
    { data: existing, error: existingError },
  ] = await Promise.all([
    supabase
      .from("availability_rules")
      .select("day_of_week, start_time, end_time, is_available")
      .eq("user_id", userId),
    supabase.from("blocked_times").select("start_at, end_at").eq("user_id", userId),
    supabase
      .from("appointments")
      .select("id, start_at, end_at")
      .eq("user_id", userId)
      .in("status", ["requested", "confirmed"]),
  ]);

  if (rulesError) throw new Error(rulesError.message);
  if (blockedError) throw new Error(blockedError.message);
  if (existingError) throw new Error(existingError.message);

  const upcoming = (existing ?? []).filter((appointment) => appointment.id !== ignoreAppointmentId);

  if (!isWithinAvailability(startAt, endAt, rules ?? [])) {
    throw new Error("That appointment time falls outside your availability rules.");
  }

  if (hasConflict(startAt, endAt, blocked ?? [])) {
    throw new Error("That appointment overlaps blocked time.");
  }

  if (hasConflict(startAt, endAt, upcoming)) {
    throw new Error("That appointment overlaps another appointment.");
  }
}

export async function updateBookingSlug(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = bookingSlugSchema.parse({
    booking_slug: formData.get("booking_slug"),
  });

  const { error } = await supabase
    .from("profiles")
    .update({ booking_slug: parsed.booking_slug })
    .eq("id", user.id);

  if (error) throw new Error(error.message);

  revalidateAppointmentRoutes(parsed.booking_slug);
}

export async function createServiceType(formData: FormData) {
  const { supabase, user } = await requireUser();

  const parsed = serviceTypeSchema.parse({
    name: formData.get("name"),
    description: formData.get("description"),
    duration_minutes: formData.get("duration_minutes"),
    requires_approval: formData.get("requires_approval") === "on",
    public_booking_enabled: formData.get("public_booking_enabled") === "on",
  });

  const { error } = await supabase.from("service_types").insert({
    user_id: user.id,
    ...parsed,
  });

  if (error) throw new Error(error.message);

  revalidateAppointmentRoutes();
}

export async function deleteServiceType(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = String(formData.get("id") || "");

  const { error } = await supabase
    .from("service_types")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidateAppointmentRoutes();
}

export async function createAvailabilityRule(formData: FormData) {
  const { supabase, user } = await requireUser();

  const parsed = availabilityRuleSchema.parse({
    day_of_week: formData.get("day_of_week"),
    start_time: formData.get("start_time"),
    end_time: formData.get("end_time"),
    is_available: formData.get("is_available") === "on",
  });

  const { error } = await supabase.from("availability_rules").insert({
    user_id: user.id,
    ...parsed,
  });

  if (error) throw new Error(error.message);

  revalidateAppointmentRoutes();
}

export async function deleteAvailabilityRule(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = String(formData.get("id") || "");

  const { error } = await supabase
    .from("availability_rules")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidateAppointmentRoutes();
}

export async function createBlockedTime(formData: FormData) {
  const { supabase, user } = await requireUser();

  const parsed = blockedTimeSchema.parse({
    title: formData.get("title"),
    start_at: formData.get("start_at"),
    end_at: formData.get("end_at"),
  });

  const { error } = await supabase.from("blocked_times").insert({
    user_id: user.id,
    ...parsed,
  });

  if (error) throw new Error(error.message);

  revalidateAppointmentRoutes();
}

export async function deleteBlockedTime(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = String(formData.get("id") || "");

  const { error } = await supabase
    .from("blocked_times")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidateAppointmentRoutes();
}

export async function createAppointment(formData: FormData) {
  const { supabase, user } = await requireUser();

  const parsed = appointmentSchema.parse({
    service_type_id: formData.get("service_type_id"),
    customer_id: formData.get("customer_id"),
    vehicle_id: formData.get("vehicle_id"),
    title: formData.get("title"),
    notes: formData.get("notes"),
    status: formData.get("status"),
    source: "owner",
    start_at: formData.get("start_at"),
    end_at: formData.get("end_at"),
    contact_name: formData.get("contact_name"),
    contact_phone: formData.get("contact_phone"),
    contact_email: formData.get("contact_email"),
  });

  const startAt = new Date(parsed.start_at);
  const endAt = new Date(parsed.end_at);

  await ensureAppointmentSlotAvailable({
    supabase,
    userId: user.id,
    startAt,
    endAt,
  });

  const { error } = await supabase.from("appointments").insert({
    user_id: user.id,
    service_type_id: parsed.service_type_id,
    customer_id: parsed.customer_id ?? null,
    vehicle_id: parsed.vehicle_id ?? null,
    title: parsed.title ?? null,
    notes: parsed.notes ?? null,
    status: parsed.status,
    source: "owner",
    start_at: parsed.start_at,
    end_at: parsed.end_at,
    contact_name: parsed.contact_name ?? null,
    contact_phone: parsed.contact_phone ?? null,
    contact_email: parsed.contact_email ?? null,
  });

  if (error) throw new Error(error.message);

  revalidateAppointmentRoutes();
}

export async function updateAppointmentStatus(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = String(formData.get("id") || "");
  const rawStatus = String(formData.get("status") || "requested");
  const status: AppointmentStatus = isAppointmentStatus(rawStatus) ? rawStatus : "requested";

  const { error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidateAppointmentRoutes();
}

export async function deleteAppointment(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = String(formData.get("id") || "");

  const { error } = await supabase
    .from("appointments")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidateAppointmentRoutes();
}

export async function publicCreateBooking(formData: FormData) {
  const admin = createAdminClient();

  const parsed = publicBookingSchema.parse({
    booking_slug: formData.get("booking_slug"),
    service_type_id: formData.get("service_type_id"),
    slot_start_at: formData.get("slot_start_at"),
    contact_name: formData.get("contact_name"),
    contact_phone: formData.get("contact_phone"),
    contact_email: formData.get("contact_email"),
    vehicle_year: formData.get("vehicle_year"),
    vehicle_make: formData.get("vehicle_make"),
    vehicle_model: formData.get("vehicle_model"),
    notes: formData.get("notes"),
  });

  const { data: owner, error: ownerError } = await admin
    .from("profiles")
    .select("id, booking_slug")
    .eq("booking_slug", parsed.booking_slug)
    .single();

  if (ownerError || !owner) {
    throw new Error("Booking page not found.");
  }

  const { data: serviceType, error: serviceError } = await admin
    .from("service_types")
    .select("id, name, duration_minutes, requires_approval, public_booking_enabled")
    .eq("id", parsed.service_type_id)
    .eq("user_id", owner.id)
    .single();

  if (serviceError || !serviceType || !serviceType.public_booking_enabled) {
    throw new Error("Selected service is not available for public booking.");
  }

  const slotStart = new Date(parsed.slot_start_at);
  const slotEnd = new Date(slotStart.getTime() + serviceType.duration_minutes * 60 * 1000);

  const [{ data: rules }, { data: blocked }, { data: existing }] = await Promise.all([
    admin
      .from("availability_rules")
      .select("day_of_week, start_time, end_time, is_available")
      .eq("user_id", owner.id),
    admin.from("blocked_times").select("start_at, end_at").eq("user_id", owner.id),
    admin
      .from("appointments")
      .select("start_at, end_at")
      .eq("user_id", owner.id)
      .in("status", ["requested", "confirmed"]),
  ]);

  const candidateSlots = buildAvailableSlots({
    durationMinutes: serviceType.duration_minutes,
    availabilityRules: rules ?? [],
    blockedTimes: blocked ?? [],
    appointments: existing ?? [],
    daysToScan: 30,
    maxSlots: 200,
  });

  const slotStillAvailable = candidateSlots.some((slot) => slot.startAt === slotStart.toISOString());

  if (!slotStillAvailable) {
    throw new Error("That appointment slot is no longer available.");
  }

  let customerId: string | null = null;
  let vehicleId: string | null = null;

  const { data: existingCustomer } = await admin
    .from("customers")
    .select("id")
    .eq("user_id", owner.id)
    .eq("phone", parsed.contact_phone)
    .limit(1)
    .maybeSingle();

  if (existingCustomer?.id) {
    customerId = existingCustomer.id;
  } else {
    const { data: customer, error: customerError } = await admin
      .from("customers")
      .insert({
        user_id: owner.id,
        full_name: parsed.contact_name,
        phone: parsed.contact_phone,
        email: parsed.contact_email ?? null,
        preferred_contact: parsed.contact_email ? "either" : "text",
      })
      .select("id")
      .single();

    if (customerError || !customer) {
      throw new Error(customerError?.message ?? "Unable to create customer.");
    }

    customerId = customer.id;
  }

  if (customerId && parsed.vehicle_year && parsed.vehicle_make && parsed.vehicle_model) {
    const { data: vehicle, error: vehicleError } = await admin
      .from("vehicles")
      .insert({
        user_id: owner.id,
        customer_id: customerId,
        year: parsed.vehicle_year,
        make: parsed.vehicle_make,
        model: parsed.vehicle_model,
      })
      .select("id")
      .single();

    if (!vehicleError && vehicle) {
      vehicleId = vehicle.id;
    }
  }

  const bookingStatus: AppointmentStatus = serviceType.requires_approval ? "requested" : "confirmed";

  const { error: appointmentError } = await admin.from("appointments").insert({
    user_id: owner.id,
    customer_id: customerId,
    vehicle_id: vehicleId,
    service_type_id: serviceType.id,
    title: serviceType.name,
    notes: parsed.notes ?? null,
    status: bookingStatus,
    source: "customer",
    start_at: slotStart.toISOString(),
    end_at: slotEnd.toISOString(),
    contact_name: parsed.contact_name,
    contact_phone: parsed.contact_phone,
    contact_email: parsed.contact_email ?? null,
    vehicle_year: parsed.vehicle_year ?? null,
    vehicle_make: parsed.vehicle_make ?? null,
    vehicle_model: parsed.vehicle_model ?? null,
  });

  if (appointmentError) {
    throw new Error(appointmentError.message);
  }

  revalidateAppointmentRoutes(owner.booking_slug ?? undefined);
}
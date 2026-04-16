import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, Wrench } from "lucide-react";
import { PublicBookingForm } from "@/components/appointments/public-booking-form";
import { Card } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildAvailableSlots } from "@/lib/schedule";
import { publicCreateBooking } from "@/lib/actions/appointments";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function PublicBookingPage({ params }: Props) {
  const { slug } = await params;
  const admin = createAdminClient();

  const { data: profile } = await admin.from("profiles").select("id, business_name, service_area, booking_slug").eq("booking_slug", slug).maybeSingle();
  if (!profile) notFound();

  const [{ data: serviceTypes }, { data: availabilityRules }, { data: blockedTimes }, { data: appointments }] = await Promise.all([
    admin.from("service_types").select("id, name, duration_minutes, public_booking_enabled").eq("user_id", profile.id).eq("public_booking_enabled", true).order("name"),
    admin.from("availability_rules").select("day_of_week, start_time, end_time, is_available").eq("user_id", profile.id),
    admin.from("blocked_times").select("start_at, end_at").eq("user_id", profile.id),
    admin.from("appointments").select("start_at, end_at").eq("user_id", profile.id).in("status", ["requested", "confirmed"]),
  ]);

  const enabledServices = serviceTypes ?? [];
  const slotsByService = Object.fromEntries(
    enabledServices.map((serviceType) => [
      serviceType.id,
      buildAvailableSlots({
        durationMinutes: serviceType.duration_minutes,
        availabilityRules: availabilityRules ?? [],
        blockedTimes: blockedTimes ?? [],
        appointments: appointments ?? [],
        daysToScan: 21,
        maxSlots: 60,
      }),
    ]),
  );

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6">
      <div className="overflow-hidden rounded-[32px] bg-slate-900 text-white shadow-[0_18px_45px_rgba(15,23,42,0.22)]">
        <div className="bg-[radial-gradient(circle_at_top_right,rgba(148,163,184,0.25),transparent_40%)] p-6">
          <div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-300">
            Rapid Wrench booking
          </div>
          <h1 className="mt-3 text-3xl font-bold">Book an appointment</h1>
          <p className="mt-2 text-sm text-slate-300">{profile.business_name}{profile.service_area ? ` • ${profile.service_area}` : ""}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr,0.85fr]">
        <Card>
          {enabledServices.length === 0 ? (
            <div className="grid gap-2 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">Booking is not ready yet.</p>
              <p>This shop has not published any service types for customer self-booking.</p>
            </div>
          ) : (
            <PublicBookingForm action={publicCreateBooking} bookingSlug={slug} serviceTypes={enabledServices} slotsByService={slotsByService} />
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="flex items-start gap-3">
              <CalendarClock className="mt-0.5 h-5 w-5 text-slate-500" />
              <div>
                <p className="font-semibold text-slate-900">Automatic time slots</p>
                <p className="mt-1 text-sm text-slate-600">Only open times are shown. Lunch, blocked time, and existing appointments stay unavailable automatically.</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-start gap-3">
              <Wrench className="mt-0.5 h-5 w-5 text-slate-500" />
              <div>
                <p className="font-semibold text-slate-900">What to include</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                  <li>What the vehicle is doing</li>
                  <li>Vehicle year, make, and model</li>
                  <li>Best phone number to reach you</li>
                </ul>
              </div>
            </div>
          </Card>
          <Card>
            <p className="text-sm text-slate-600">Already use the app?</p>
            <Link href="/login" className="mt-2 inline-flex text-sm font-medium text-slate-900 underline underline-offset-2">
              Go to owner login
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}

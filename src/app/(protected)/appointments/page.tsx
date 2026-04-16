import Link from "next/link";
import { CalendarClock, LinkIcon, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select, Textarea } from "@/components/ui/forms";
import { SectionTitle } from "@/components/ui/section-title";
import {
  createAppointment,
  createAvailabilityRule,
  createBlockedTime,
  createServiceType,
  deleteAppointment,
  deleteAvailabilityRule,
  deleteBlockedTime,
  deleteServiceType,
  updateAppointmentStatus,
  updateBookingSlug,
} from "@/lib/actions/appointments";
import { createClient } from "@/lib/supabase/server";
import { appointmentStatusOptions } from "@/lib/validators/appointment";

export const dynamic = "force-dynamic";

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type ServiceType = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  requires_approval: boolean;
  public_booking_enabled: boolean;
};

type AvailabilityRule = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
};

type BlockedTime = {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
};

type Appointment = {
  id: string;
  title: string | null;
  notes: string | null;
  status: (typeof appointmentStatusOptions)[number];
  source: string;
  start_at: string;
  end_at: string;
  contact_name: string | null;
  contact_phone: string | null;
  customer: { full_name: string | null } | null;
  vehicle: { year: number; make: string; model: string } | null;
  service_type: { name: string; duration_minutes: number } | null;
};

async function getAppointmentsPageData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      profile: null,
      serviceTypes: [] as ServiceType[],
      availabilityRules: [] as AvailabilityRule[],
      blockedTimes: [] as BlockedTime[],
      appointments: [] as Appointment[],
      customers: [] as { id: string; full_name: string }[],
      vehicles: [] as { id: string; year: number; make: string; model: string }[],
    };
  }

  const [profileResult, serviceTypesResult, availabilityResult, blockedResult, appointmentsResult, customersResult, vehiclesResult] = await Promise.all([
    supabase.from("profiles").select("business_name, booking_slug").eq("id", user.id).single(),
    supabase.from("service_types").select("id, name, description, duration_minutes, requires_approval, public_booking_enabled").eq("user_id", user.id).order("name"),
    supabase.from("availability_rules").select("id, day_of_week, start_time, end_time, is_available").eq("user_id", user.id).order("day_of_week").order("start_time"),
    supabase.from("blocked_times").select("id, title, start_at, end_at").eq("user_id", user.id).order("start_at"),
    supabase.from("appointments").select(`
      id,
      title,
      notes,
      status,
      source,
      start_at,
      end_at,
      contact_name,
      contact_phone,
      customer:customers!appointments_customer_id_fkey(full_name),
      vehicle:vehicles!appointments_vehicle_id_fkey(year, make, model),
      service_type:service_types!appointments_service_type_id_fkey(name, duration_minutes)
    `).eq("user_id", user.id).order("start_at").limit(20),
    supabase.from("customers").select("id, full_name").eq("user_id", user.id).order("full_name"),
    supabase.from("vehicles").select("id, year, make, model").eq("user_id", user.id).order("year", { ascending: false }),
  ]);

  for (const result of [profileResult, serviceTypesResult, availabilityResult, blockedResult, appointmentsResult, customersResult, vehiclesResult]) {
    if (result.error) throw new Error(result.error.message);
  }

  return {
    profile: profileResult.data,
    serviceTypes: serviceTypesResult.data ?? [],
    availabilityRules: availabilityResult.data ?? [],
    blockedTimes: blockedResult.data ?? [],
    appointments: (appointmentsResult.data ?? []) as Appointment[],
    customers: customersResult.data ?? [],
    vehicles: vehiclesResult.data ?? [],
  };
}

export default async function AppointmentsPage() {
  const { profile, serviceTypes, availabilityRules, blockedTimes, appointments, customers, vehicles } = await getAppointmentsPageData();
  const bookingUrl = profile?.booking_slug ? `/book/${profile.booking_slug}` : null;

  return (
    <AppShell title="Appointments" description="Let customers self-book and keep your schedule under control.">
      <Card>
        <SectionTitle title="Public booking link" description="Share this page with customers so they can request or book open time slots." />
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr,auto]">
          <form action={updateBookingSlug} className="grid gap-3">
            <Field label="Booking slug" hint="Used in your public booking URL.">
              <Input name="booking_slug" defaultValue={profile?.booking_slug ?? ""} placeholder="rw-dylan" />
            </Field>
            <Button type="submit">Save booking slug</Button>
          </form>
          {bookingUrl ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-medium text-slate-900">Booking URL</p>
              <p className="mt-2 break-all">{bookingUrl}</p>
              <Link href={bookingUrl} className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-slate-900">
                <LinkIcon className="h-4 w-4" /> Open booking page
              </Link>
            </div>
          ) : null}
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <SectionTitle title="Service types" description="Each service controls booking length and whether approval is needed." />
          <form action={createServiceType} className="mt-4 grid gap-3">
            <Field label="Service name"><Input name="name" placeholder="Diagnostics" required /></Field>
            <Field label="Description"><Textarea name="description" placeholder="Quick field diagnostic and code scan" /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Duration (minutes)"><Input name="duration_minutes" type="number" min="15" max="480" defaultValue="60" required /></Field>
              <div className="grid gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" name="requires_approval" /> Requires approval</label>
                <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" name="public_booking_enabled" defaultChecked /> Public booking enabled</label>
              </div>
            </div>
            <Button type="submit">Add service type</Button>
          </form>

          <div className="mt-4 space-y-3">
            {serviceTypes.length === 0 ? <EmptyState title="No service types yet" description="Add your common jobs so the app can create appointment lengths automatically." /> : serviceTypes.map((serviceType) => (
              <div key={serviceType.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{serviceType.name}</p>
                    <p className="mt-1 text-sm text-slate-600">{serviceType.duration_minutes} minutes • {serviceType.requires_approval ? 'approval required' : 'auto confirm'}</p>
                    {serviceType.description ? <p className="mt-1 text-sm text-slate-500">{serviceType.description}</p> : null}
                  </div>
                  <form action={deleteServiceType}><input type="hidden" name="id" value={serviceType.id} /><Button type="submit" variant="danger"><Trash2 className="h-4 w-4" /> Delete</Button></form>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle title="Weekly availability" description="Only these windows can be booked automatically." />
          <form action={createAvailabilityRule} className="mt-4 grid gap-3 sm:grid-cols-4">
            <Field label="Day"><Select name="day_of_week">{dayNames.map((day, index) => <option key={day} value={index}>{day}</option>)}</Select></Field>
            <Field label="Start"><Input type="time" name="start_time" defaultValue="08:00" required /></Field>
            <Field label="End"><Input type="time" name="end_time" defaultValue="17:00" required /></Field>
            <div className="grid gap-2"><label className="flex items-center gap-2 text-sm text-slate-700 pt-8"><input type="checkbox" name="is_available" defaultChecked /> Available</label><Button type="submit">Add</Button></div>
          </form>
          <div className="mt-4 space-y-3">
            {availabilityRules.length === 0 ? <EmptyState title="No availability set" description="Add your working hours so customers only see times you actually want." /> : availabilityRules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <div>{dayNames[rule.day_of_week]} • {rule.start_time} – {rule.end_time}</div>
                <form action={deleteAvailabilityRule}><input type="hidden" name="id" value={rule.id} /><Button type="submit" variant="danger"><Trash2 className="h-4 w-4" /> Delete</Button></form>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <SectionTitle title="Block off time" description="Use this for lunch, travel, days off, or anything else you do not want booked." />
          <form action={createBlockedTime} className="mt-4 grid gap-3">
            <Field label="Reason"><Input name="title" placeholder="Lunch / travel / personal" required /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Start"><Input type="datetime-local" name="start_at" required /></Field>
              <Field label="End"><Input type="datetime-local" name="end_at" required /></Field>
            </div>
            <Button type="submit">Add blocked time</Button>
          </form>
          <div className="mt-4 space-y-3">
            {blockedTimes.length === 0 ? <EmptyState title="No blocked time" description="Your calendar is wide open right now." /> : blockedTimes.map((block) => (
              <div key={block.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <div><p className="font-medium text-slate-900">{block.title}</p><p>{new Date(block.start_at).toLocaleString()} → {new Date(block.end_at).toLocaleString()}</p></div>
                <form action={deleteBlockedTime}><input type="hidden" name="id" value={block.id} /><Button type="submit" variant="danger"><Trash2 className="h-4 w-4" /> Delete</Button></form>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle title="Owner-made appointment" description="Create an appointment manually when you schedule a customer yourself." />
          <form action={createAppointment} className="mt-4 grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Service type"><Select name="service_type_id" required>{serviceTypes.map((serviceType) => <option key={serviceType.id} value={serviceType.id}>{serviceType.name}</option>)}</Select></Field>
              <Field label="Status"><Select name="status">{appointmentStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</Select></Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Customer"><Select name="customer_id"><option value="">No linked customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.full_name}</option>)}</Select></Field>
              <Field label="Vehicle"><Select name="vehicle_id"><option value="">No linked vehicle</option>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.year} {vehicle.make} {vehicle.model}</option>)}</Select></Field>
            </div>
            <Field label="Title"><Input name="title" placeholder="On-site diagnostic" /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Start"><Input type="datetime-local" name="start_at" required /></Field>
              <Field label="End"><Input type="datetime-local" name="end_at" required /></Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Contact name"><Input name="contact_name" placeholder="Customer name" /></Field>
              <Field label="Contact phone"><Input name="contact_phone" placeholder="Phone" /></Field>
            </div>
            <Field label="Contact email"><Input type="email" name="contact_email" placeholder="Email" /></Field>
            <Field label="Notes"><Textarea name="notes" placeholder="Special instructions, address notes, parts to bring" /></Field>
            <Button type="submit">Save appointment</Button>
          </form>
        </Card>
      </div>

      <Card>
        <SectionTitle title="Upcoming appointments" description="Review customer bookings and update the status as you go." />
        <div className="mt-4 space-y-3">
          {appointments.length === 0 ? <EmptyState title="No appointments yet" description="Once you or your customers start booking, they will show up here." /> : appointments.map((appointment) => (
            <div key={appointment.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-slate-900">{appointment.title || appointment.service_type?.name || 'Appointment'}</p>
                  <p className="mt-1 text-sm text-slate-600">{appointment.contact_name || appointment.customer?.full_name || 'Unknown contact'} • {new Date(appointment.start_at).toLocaleString()}</p>
                  <p className="mt-1 text-sm text-slate-500">{appointment.vehicle ? `${appointment.vehicle.year} ${appointment.vehicle.make} ${appointment.vehicle.model}` : 'Vehicle not linked'} • {appointment.source}</p>
                </div>
                <div className="rounded-full bg-white px-3 py-1 text-xs font-medium capitalize text-slate-700 shadow-sm">{appointment.status}</div>
              </div>
              {appointment.notes ? <p className="mt-3 text-sm text-slate-700">{appointment.notes}</p> : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <form action={updateAppointmentStatus}><input type="hidden" name="id" value={appointment.id} /><input type="hidden" name="status" value="confirmed" /><Button type="submit" variant="secondary">Confirm</Button></form>
                <form action={updateAppointmentStatus}><input type="hidden" name="id" value={appointment.id} /><input type="hidden" name="status" value="completed" /><Button type="submit" variant="secondary">Complete</Button></form>
                <form action={updateAppointmentStatus}><input type="hidden" name="id" value={appointment.id} /><input type="hidden" name="status" value="cancelled" /><Button type="submit" variant="ghost">Cancel</Button></form>
                <form action={deleteAppointment}><input type="hidden" name="id" value={appointment.id} /><Button type="submit" variant="danger"><Trash2 className="h-4 w-4" /> Delete</Button></form>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </AppShell>
  );
}

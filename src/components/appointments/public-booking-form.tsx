"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/forms";

type SlotOption = {
  startAt: string;
  endAt: string;
  label: string;
};

type ServiceType = {
  id: string;
  name: string;
  duration_minutes: number;
};

export function PublicBookingForm({
  action,
  bookingSlug,
  serviceTypes,
  slotsByService,
}: {
  action: (formData: FormData) => Promise<void>;
  bookingSlug: string;
  serviceTypes: ServiceType[];
  slotsByService: Record<string, SlotOption[]>;
}) {
  const [serviceTypeId, setServiceTypeId] = useState(serviceTypes[0]?.id ?? "");
  const availableSlots = useMemo(() => slotsByService[serviceTypeId] ?? [], [serviceTypeId, slotsByService]);

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="booking_slug" value={bookingSlug} />

      <Field label="Service">
        <Select name="service_type_id" value={serviceTypeId} onChange={(event) => setServiceTypeId(event.target.value)} required>
          {serviceTypes.map((serviceType) => (
            <option key={serviceType.id} value={serviceType.id}>
              {serviceType.name} ({serviceType.duration_minutes} min)
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Available time">
        <Select name="slot_start_at" required>
          {availableSlots.length === 0 ? <option value="">No open slots available</option> : null}
          {availableSlots.map((slot) => (
            <option key={slot.startAt} value={slot.startAt}>
              {slot.label}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Your name">
          <Input name="contact_name" placeholder="Full name" required />
        </Field>
        <Field label="Phone">
          <Input name="contact_phone" placeholder="Phone number" required />
        </Field>
      </div>

      <Field label="Email">
        <Input type="email" name="contact_email" placeholder="Optional email" />
      </Field>

      <Card className="space-y-3 bg-slate-50">
        <p className="text-sm font-semibold text-slate-900">Vehicle info</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Year">
            <Input name="vehicle_year" type="number" min="1900" max="2100" placeholder="2014" />
          </Field>
          <Field label="Make">
            <Input name="vehicle_make" placeholder="Chevrolet" />
          </Field>
          <Field label="Model">
            <Input name="vehicle_model" placeholder="Traverse" />
          </Field>
        </div>
      </Card>

      <Field label="Problem / notes">
        <Textarea name="notes" placeholder="Tell Rapid Wrench what the vehicle is doing and anything important to know." />
      </Field>

      <Button type="submit" size="lg" disabled={availableSlots.length === 0}>
        Book appointment
      </Button>
    </form>
  );
}

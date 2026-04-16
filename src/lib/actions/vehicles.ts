'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { vehicleIdSchema, vehicleSchema } from '@/lib/validators/vehicle';

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Not authenticated');
  }

  return { supabase, user };
}

function normalizeVehicleForm(formData: FormData) {
  const parsed = vehicleSchema.parse({
    customer_id: formData.get('customer_id'),
    year: formData.get('year'),
    make: formData.get('make'),
    model: formData.get('model'),
    engine: formData.get('engine'),
    vin: formData.get('vin'),
    mileage: formData.get('mileage'),
    license_plate: formData.get('license_plate'),
    color: formData.get('color'),
    notes: formData.get('notes'),
  });

  return {
    ...parsed,
    vin: parsed.vin?.toUpperCase() ?? undefined,
  };
}

function revalidateVehicleRoutes() {
  revalidatePath('/vehicles');
  revalidatePath('/people');
  revalidatePath('/jobs');
}

export async function createVehicle(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = normalizeVehicleForm(formData);

  const { error } = await supabase.from('vehicles').insert({
    user_id: user.id,
    customer_id: parsed.customer_id,
    year: parsed.year,
    make: parsed.make,
    model: parsed.model,
    engine: parsed.engine ?? null,
    vin: parsed.vin ?? null,
    mileage: parsed.mileage ?? null,
    license_plate: parsed.license_plate ?? null,
    color: parsed.color ?? null,
    notes: parsed.notes ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidateVehicleRoutes();
}

export async function updateVehicle(formData: FormData) {
  const { supabase, user } = await requireUser();
  const vehicleId = vehicleIdSchema.parse(formData.get('id'));
  const parsed = normalizeVehicleForm(formData);

  const { error } = await supabase
    .from('vehicles')
    .update({
      customer_id: parsed.customer_id,
      year: parsed.year,
      make: parsed.make,
      model: parsed.model,
      engine: parsed.engine ?? null,
      vin: parsed.vin ?? null,
      mileage: parsed.mileage ?? null,
      license_plate: parsed.license_plate ?? null,
      color: parsed.color ?? null,
      notes: parsed.notes ?? null,
    })
    .eq('id', vehicleId)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidateVehicleRoutes();
}

export async function deleteVehicle(formData: FormData) {
  const { supabase, user } = await requireUser();
  const vehicleId = vehicleIdSchema.parse(formData.get('id'));

  const { error } = await supabase.from('vehicles').delete().eq('id', vehicleId).eq('user_id', user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidateVehicleRoutes();
}

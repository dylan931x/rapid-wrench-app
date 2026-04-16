'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { customerIdSchema, customerSchema } from '@/lib/validators/customer';

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

function normalizeCustomerForm(formData: FormData) {
  return customerSchema.parse({
    full_name: formData.get('full_name'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    area: formData.get('area'),
    preferred_contact: formData.get('preferred_contact'),
    notes: formData.get('notes'),
  });
}

function revalidateCustomerRoutes() {
  revalidatePath('/customers');
  revalidatePath('/people');
}

export async function createCustomer(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = normalizeCustomerForm(formData);

  const { error } = await supabase.from('customers').insert({
    user_id: user.id,
    ...parsed,
    email: parsed.email ?? null,
    area: parsed.area ?? null,
    notes: parsed.notes ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidateCustomerRoutes();
}

export async function updateCustomer(formData: FormData) {
  const { supabase, user } = await requireUser();
  const customerId = customerIdSchema.parse(formData.get('id'));
  const parsed = normalizeCustomerForm(formData);

  const { error } = await supabase
    .from('customers')
    .update({
      ...parsed,
      email: parsed.email ?? null,
      area: parsed.area ?? null,
      notes: parsed.notes ?? null,
    })
    .eq('id', customerId)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidateCustomerRoutes();
}

export async function deleteCustomer(formData: FormData) {
  const { supabase, user } = await requireUser();
  const customerId = customerIdSchema.parse(formData.get('id'));

  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', customerId)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidateCustomerRoutes();
}

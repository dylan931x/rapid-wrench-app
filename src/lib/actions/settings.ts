'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { businessSettingsSchema, profileSettingsSchema } from '@/lib/validators/settings';

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

function revalidateSettingRoutes() {
  revalidatePath('/');
  revalidatePath('/docs');
  revalidatePath('/jobs');
  revalidatePath('/settings');
}

export async function updateProfileSettings(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = profileSettingsSchema.parse({
    business_name: formData.get('business_name'),
    owner_name: formData.get('owner_name'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    service_area: formData.get('service_area'),
  });

  const { error } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      business_name: parsed.business_name,
      owner_name: parsed.owner_name ?? null,
      phone: parsed.phone ?? null,
      email: parsed.email ?? user.email ?? null,
      service_area: parsed.service_area ?? null,
    },
    { onConflict: 'id' },
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidateSettingRoutes();
}

export async function updateBusinessSettings(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = businessSettingsSchema.parse({
    default_warranty_text: formData.get('default_warranty_text'),
    default_policy_text: formData.get('default_policy_text'),
    invoice_footer_text: formData.get('invoice_footer_text'),
    require_deposit: formData.get('require_deposit') === 'on',
  });

  const { error } = await supabase.from('business_settings').upsert(
    {
      user_id: user.id,
      default_warranty_text: parsed.default_warranty_text,
      default_policy_text: parsed.default_policy_text,
      invoice_footer_text: parsed.invoice_footer_text ?? null,
      require_deposit: parsed.require_deposit,
    },
    { onConflict: 'user_id' },
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidateSettingRoutes();
}

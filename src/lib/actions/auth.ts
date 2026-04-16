'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

function toMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export async function signInAction(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    redirect('/login?error=Email%20and%20password%20are%20required.');
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(toMessage(error, 'Unable to sign in.'))}`);
  }

  revalidatePath('/', 'layout');
  redirect('/');
}

export async function signUpAction(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const ownerName = String(formData.get('owner_name') ?? '').trim();
  const businessName = String(formData.get('business_name') ?? '').trim();

  if (!email || !password) {
    redirect('/login?error=Email%20and%20password%20are%20required%20to%20create%20an%20account.');
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        owner_name: ownerName,
        business_name: businessName || 'Rapid Wrench',
      },
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(toMessage(error, 'Unable to create account.'))}`);
  }

  redirect('/login?message=Account%20created.%20If%20email%20confirmation%20is%20enabled%2C%20check%20your%20inbox%20before%20signing%20in.');
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login?message=Signed%20out.');
}

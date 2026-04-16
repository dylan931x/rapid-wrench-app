'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { paymentIdSchema, paymentSchema } from '@/lib/validators/payment';

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

function normalizePaymentForm(formData: FormData) {
  return paymentSchema.parse({
    job_id: formData.get('job_id'),
    amount: formData.get('amount'),
    payment_method: formData.get('payment_method'),
    note: formData.get('note'),
    paid_at: formData.get('paid_at'),
  });
}

function revalidatePaymentRoutes() {
  revalidatePath('/');
  revalidatePath('/jobs');
  revalidatePath('/payments');
  revalidatePath('/docs');
}

export async function createPayment(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = normalizePaymentForm(formData);

  const { error } = await supabase.from('payments').insert({
    user_id: user.id,
    job_id: parsed.job_id,
    amount: parsed.amount,
    payment_method: parsed.payment_method,
    note: parsed.note ?? null,
    paid_at: parsed.paid_at ?? undefined,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePaymentRoutes();
}

export async function updatePayment(formData: FormData) {
  const { supabase, user } = await requireUser();
  const paymentId = paymentIdSchema.parse(formData.get('id'));
  const parsed = normalizePaymentForm(formData);

  const { data: existingPayment, error: existingError } = await supabase
    .from('payments')
    .select('job_id')
    .eq('id', paymentId)
    .eq('user_id', user.id)
    .single();

  if (existingError || !existingPayment) {
    throw new Error(existingError?.message ?? 'Payment not found.');
  }

  const { error } = await supabase
    .from('payments')
    .update({
      job_id: parsed.job_id,
      amount: parsed.amount,
      payment_method: parsed.payment_method,
      note: parsed.note ?? null,
      paid_at: parsed.paid_at ?? new Date().toISOString(),
    })
    .eq('id', paymentId)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(error.message);
  }

  if (existingPayment.job_id !== parsed.job_id) {
    const { error: recalcError } = await supabase.rpc('recalculate_job_totals', {
      p_job_id: existingPayment.job_id,
    });

    if (recalcError) {
      throw new Error(recalcError.message);
    }
  }

  revalidatePaymentRoutes();
}

export async function deletePayment(formData: FormData) {
  const { supabase, user } = await requireUser();
  const paymentId = paymentIdSchema.parse(formData.get('id'));

  const { error } = await supabase.from('payments').delete().eq('id', paymentId).eq('user_id', user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePaymentRoutes();
}

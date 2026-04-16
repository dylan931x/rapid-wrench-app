'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { jobIdSchema, jobSchema } from '@/lib/validators/job';

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

function normalizeJobForm(formData: FormData) {
  return jobSchema.parse({
    customer_id: formData.get('customer_id'),
    vehicle_id: formData.get('vehicle_id'),
    title: formData.get('title'),
    complaint: formData.get('complaint'),
    diagnosis_notes: formData.get('diagnosis_notes'),
    recommended_tests: formData.get('recommended_tests'),
    repair_performed: formData.get('repair_performed'),
    status: formData.get('status'),
    labor_amount: formData.get('labor_amount'),
    parts_amount: formData.get('parts_amount'),
    initial_deposit: formData.get('initial_deposit'),
    initial_payment_method: formData.get('initial_payment_method'),
    next_step: formData.get('next_step'),
    warranty_text: formData.get('warranty_text'),
    scheduled_for: formData.get('scheduled_for'),
  });
}

function revalidateJobRoutes() {
  revalidatePath('/');
  revalidatePath('/jobs');
  revalidatePath('/docs');
  revalidatePath('/people');
}

export async function createJob(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = normalizeJobForm(formData);

  const settingsResult = await supabase
    .from('business_settings')
    .select('default_warranty_text')
    .eq('user_id', user.id)
    .single();

  const { data: job, error } = await supabase
    .from('jobs')
    .insert({
      user_id: user.id,
      customer_id: parsed.customer_id,
      vehicle_id: parsed.vehicle_id,
      title: parsed.title ?? null,
      complaint: parsed.complaint,
      diagnosis_notes: parsed.diagnosis_notes ?? null,
      recommended_tests: parsed.recommended_tests ?? null,
      repair_performed: parsed.repair_performed ?? null,
      status: parsed.status,
      labor_amount: parsed.labor_amount,
      parts_amount: parsed.parts_amount,
      next_step: parsed.next_step ?? null,
      warranty_text: parsed.warranty_text ?? settingsResult.data?.default_warranty_text ?? '2 years workmanship',
      scheduled_for: parsed.scheduled_for ?? null,
      completed_at: parsed.status === 'completed' ? new Date().toISOString() : null,
    })
    .select('id')
    .single();

  if (error || !job) {
    throw new Error(error?.message ?? 'Unable to create job.');
  }

  if ((parsed.initial_deposit ?? 0) > 0) {
    const { error: paymentError } = await supabase.from('payments').insert({
      user_id: user.id,
      job_id: job.id,
      amount: parsed.initial_deposit!,
      payment_method: parsed.initial_payment_method,
      note: 'Initial deposit collected during job creation',
    });

    if (paymentError) {
      throw new Error(paymentError.message);
    }
  }

  revalidateJobRoutes();
}

export async function updateJob(formData: FormData) {
  const { supabase, user } = await requireUser();
  const jobId = jobIdSchema.parse(formData.get('id'));
  const parsed = normalizeJobForm(formData);

  const { error } = await supabase
    .from('jobs')
    .update({
      customer_id: parsed.customer_id,
      vehicle_id: parsed.vehicle_id,
      title: parsed.title ?? null,
      complaint: parsed.complaint,
      diagnosis_notes: parsed.diagnosis_notes ?? null,
      recommended_tests: parsed.recommended_tests ?? null,
      repair_performed: parsed.repair_performed ?? null,
      status: parsed.status,
      labor_amount: parsed.labor_amount,
      parts_amount: parsed.parts_amount,
      next_step: parsed.next_step ?? null,
      warranty_text: parsed.warranty_text ?? null,
      scheduled_for: parsed.scheduled_for ?? null,
      completed_at: parsed.status === 'completed' ? new Date().toISOString() : null,
    })
    .eq('id', jobId)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidateJobRoutes();
}

export async function deleteJob(formData: FormData) {
  const { supabase, user } = await requireUser();
  const jobId = jobIdSchema.parse(formData.get('id'));

  const { error } = await supabase.from('jobs').delete().eq('id', jobId).eq('user_id', user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidateJobRoutes();
}

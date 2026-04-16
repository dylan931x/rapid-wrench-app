'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { diagnosticIdSchema, diagnosticSchema } from '@/lib/validators/diagnostic';

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

function normalizeDiagnosticForm(formData: FormData) {
  return diagnosticSchema.parse({
    job_id: formData.get('job_id'),
    symptom: formData.get('symptom'),
    obd_code: formData.get('obd_code'),
    likely_causes: formData.get('likely_causes'),
    suggested_tests: formData.get('suggested_tests'),
    tech_notes: formData.get('tech_notes'),
  });
}

function revalidateDiagnosticRoutes() {
  revalidatePath('/diagnostics');
  revalidatePath('/jobs');
}

export async function createDiagnosticEntry(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = normalizeDiagnosticForm(formData);

  const { error } = await supabase.from('diagnostic_entries').insert({
    user_id: user.id,
    job_id: parsed.job_id,
    symptom: parsed.symptom ?? null,
    obd_code: parsed.obd_code ?? null,
    likely_causes: parsed.likely_causes ?? null,
    suggested_tests: parsed.suggested_tests ?? null,
    tech_notes: parsed.tech_notes ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidateDiagnosticRoutes();
}

export async function updateDiagnosticEntry(formData: FormData) {
  const { supabase, user } = await requireUser();
  const entryId = diagnosticIdSchema.parse(formData.get('id'));
  const parsed = normalizeDiagnosticForm(formData);

  const { error } = await supabase
    .from('diagnostic_entries')
    .update({
      job_id: parsed.job_id,
      symptom: parsed.symptom ?? null,
      obd_code: parsed.obd_code ?? null,
      likely_causes: parsed.likely_causes ?? null,
      suggested_tests: parsed.suggested_tests ?? null,
      tech_notes: parsed.tech_notes ?? null,
    })
    .eq('id', entryId)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidateDiagnosticRoutes();
}

export async function deleteDiagnosticEntry(formData: FormData) {
  const { supabase, user } = await requireUser();
  const entryId = diagnosticIdSchema.parse(formData.get('id'));

  const { error } = await supabase
    .from('diagnostic_entries')
    .delete()
    .eq('id', entryId)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidateDiagnosticRoutes();
}

'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  documentPdfUploadSchema,
  documentRecordSchema,
  signatureUploadSchema,
} from '@/lib/validators/document';

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

function normalizeFileName(fileName: string) {
  return fileName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, '-')
    .replace(/-+/g, '-');
}

function revalidateDocumentRoutes() {
  revalidatePath('/docs');
  revalidatePath('/jobs');
}

export async function ensureDocumentRecord(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = documentRecordSchema.parse({
    job_id: formData.get('job_id'),
    document_type: formData.get('document_type'),
    signer_name: formData.get('signer_name'),
    policy_text_snapshot: formData.get('policy_text_snapshot'),
  });

  const [{ data: job, error: jobError }, { data: settings, error: settingsError }] = await Promise.all([
    supabase
      .from('jobs')
      .select('id, warranty_text')
      .eq('id', parsed.job_id)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('business_settings')
      .select('default_policy_text, default_warranty_text')
      .eq('user_id', user.id)
      .single(),
  ]);

  if (jobError || !job) {
    throw new Error(jobError?.message ?? 'Job not found.');
  }

  if (settingsError || !settings) {
    throw new Error(settingsError?.message ?? 'Business settings not found.');
  }

  const upsertPayload = {
    user_id: user.id,
    job_id: parsed.job_id,
    document_type: parsed.document_type,
    policy_text_snapshot: parsed.policy_text_snapshot ?? settings.default_policy_text,
    warranty_text_snapshot: job.warranty_text ?? settings.default_warranty_text,
    signer_name: parsed.signer_name ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data: existingDocument, error: existingError } = await supabase
    .from('documents')
    .select('id, signer_name, signed_at, pdf_storage_path')
    .eq('user_id', user.id)
    .eq('job_id', parsed.job_id)
    .eq('document_type', parsed.document_type)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existingDocument) {
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        signer_name: parsed.signer_name ?? existingDocument.signer_name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingDocument.id)
      .eq('user_id', user.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    revalidateDocumentRoutes();
    return { documentId: existingDocument.id };
  }

  const { data: inserted, error: insertError } = await supabase
    .from('documents')
    .insert(upsertPayload)
    .select('id')
    .single();

  if (insertError || !inserted) {
    throw new Error(insertError?.message ?? 'Unable to create document.');
  }

  revalidateDocumentRoutes();
  return { documentId: inserted.id };
}

export async function saveDocumentSignature(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = signatureUploadSchema.parse({
    document_id: formData.get('document_id'),
    signer_name: formData.get('signer_name'),
    policy_text_snapshot: formData.get('policy_text_snapshot'),
  });
  const file = formData.get('signature');

  if (!(file instanceof File) || file.size === 0) {
    throw new Error('Please provide a signature image.');
  }

  const { data: document, error: documentError } = await supabase
    .from('documents')
    .select('id, signer_name')
    .eq('id', parsed.document_id)
    .eq('user_id', user.id)
    .single();

  if (documentError || !document) {
    throw new Error(documentError?.message ?? 'Document not found.');
  }

  const safeFileName = normalizeFileName(file.name || 'signature.png');
  const storagePath = `${user.id}/${parsed.document_id}/${randomUUID()}-${safeFileName}`;

  const { error: uploadError } = await supabase.storage.from('signatures').upload(storagePath, file, {
    upsert: false,
    contentType: file.type || 'image/png',
  });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data: existingSignature } = await supabase
    .from('signatures')
    .select('id, storage_path')
    .eq('document_id', parsed.document_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingSignature?.storage_path) {
    await supabase.storage.from('signatures').remove([existingSignature.storage_path]);
  }

  const { error: signatureError } = await supabase.from('signatures').upsert(
    {
      id: existingSignature?.id,
      user_id: user.id,
      document_id: parsed.document_id,
      storage_path: storagePath,
      signer_name: parsed.signer_name ?? document.signer_name ?? null,
    },
    { onConflict: 'document_id' },
  );

  if (signatureError) {
    await supabase.storage.from('signatures').remove([storagePath]);
    throw new Error(signatureError.message);
  }

  const { error: documentUpdateError } = await supabase
    .from('documents')
    .update({
      signer_name: parsed.signer_name ?? document.signer_name ?? null,
      signed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.document_id)
    .eq('user_id', user.id);

  if (documentUpdateError) {
    throw new Error(documentUpdateError.message);
  }

  revalidateDocumentRoutes();
  return { ok: true };
}

export async function uploadDocumentPdf(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = documentPdfUploadSchema.parse({
    document_id: formData.get('document_id'),
  });
  const file = formData.get('pdf');

  if (!(file instanceof File) || file.size === 0) {
    throw new Error('Please provide a PDF file.');
  }

  const { data: document, error: documentError } = await supabase
    .from('documents')
    .select('id, job_id, document_type, pdf_storage_path')
    .eq('id', parsed.document_id)
    .eq('user_id', user.id)
    .single();

  if (documentError || !document) {
    throw new Error(documentError?.message ?? 'Document not found.');
  }

  if (document.pdf_storage_path) {
    await supabase.storage.from('documents').remove([document.pdf_storage_path]);
  }

  const safeFileName = normalizeFileName(file.name || `${document.document_type}.pdf`);
  const storagePath = `${user.id}/${document.job_id}/${randomUUID()}-${safeFileName}`;

  const { error: uploadError } = await supabase.storage.from('documents').upload(storagePath, file, {
    upsert: false,
    contentType: 'application/pdf',
  });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { error: updateError } = await supabase
    .from('documents')
    .update({
      pdf_storage_path: storagePath,
      updated_at: new Date().toISOString(),
    })
    .eq('id', document.id)
    .eq('user_id', user.id);

  if (updateError) {
    await supabase.storage.from('documents').remove([storagePath]);
    throw new Error(updateError.message);
  }

  revalidateDocumentRoutes();
  return { ok: true };
}

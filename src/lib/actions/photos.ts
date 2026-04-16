'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { photoCaptionSchema, photoIdSchema, photoJobIdSchema } from '@/lib/validators/photo';

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

function revalidatePhotoRoutes() {
  revalidatePath('/jobs');
  revalidatePath('/docs');
}

export async function uploadJobPhoto(formData: FormData) {
  const { supabase, user } = await requireUser();
  const jobId = photoJobIdSchema.parse(formData.get('job_id'));
  const caption = photoCaptionSchema.parse(formData.get('caption'));
  const file = formData.get('photo');

  if (!(file instanceof File) || file.size === 0) {
    throw new Error('Please choose an image to upload.');
  }

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .single();

  if (jobError || !job) {
    throw new Error(jobError?.message ?? 'Job not found.');
  }

  const safeFileName = normalizeFileName(file.name || 'photo');
  const storagePath = `${user.id}/${jobId}/${randomUUID()}-${safeFileName}`;

  const { error: uploadError } = await supabase.storage.from('job-photos').upload(storagePath, file, {
    upsert: false,
    contentType: file.type || 'application/octet-stream',
  });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { error: insertError } = await supabase.from('job_photos').insert({
    user_id: user.id,
    job_id: jobId,
    storage_path: storagePath,
    file_name: file.name || safeFileName,
    caption: caption ?? null,
  });

  if (insertError) {
    await supabase.storage.from('job-photos').remove([storagePath]);
    throw new Error(insertError.message);
  }

  revalidatePhotoRoutes();
}

export async function deleteJobPhoto(formData: FormData) {
  const { supabase, user } = await requireUser();
  const photoId = photoIdSchema.parse(formData.get('id'));

  const { data: photo, error: photoError } = await supabase
    .from('job_photos')
    .select('id, storage_path')
    .eq('id', photoId)
    .eq('user_id', user.id)
    .single();

  if (photoError || !photo) {
    throw new Error(photoError?.message ?? 'Photo not found.');
  }

  const { error: removeError } = await supabase.storage.from('job-photos').remove([photo.storage_path]);
  if (removeError) {
    throw new Error(removeError.message);
  }

  const { error: deleteError } = await supabase
    .from('job_photos')
    .delete()
    .eq('id', photo.id)
    .eq('user_id', user.id);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  revalidatePhotoRoutes();
}

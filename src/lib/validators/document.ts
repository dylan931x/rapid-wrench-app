import { z } from 'zod';

const emptyToUndefined = (value: unknown) => {
  if (value == null) return undefined;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

export const documentTypeOptions = ['invoice', 'agreement'] as const;

export const documentRecordSchema = z.object({
  job_id: z.string().uuid('Select a valid job.'),
  document_type: z.enum(documentTypeOptions),
  signer_name: z.preprocess(emptyToUndefined, z.string().max(160).optional()),
  policy_text_snapshot: z.preprocess(emptyToUndefined, z.string().max(8000).optional()),
});

export const documentIdSchema = z.string().uuid('Invalid document id.');

export const signatureUploadSchema = z.object({
  document_id: z.string().uuid('Invalid document id.'),
  signer_name: z.preprocess(emptyToUndefined, z.string().max(160).optional()),
});

export const documentPdfUploadSchema = z.object({
  document_id: z.string().uuid('Invalid document id.'),
});

export type DocumentRecordInput = z.infer<typeof documentRecordSchema>;

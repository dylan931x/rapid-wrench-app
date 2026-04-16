import { z } from 'zod';

const emptyToUndefined = (value: unknown) => {
  if (value == null) return undefined;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

const parseLines = (value: unknown) => {
  if (value == null) return undefined;
  if (typeof value !== 'string') return value;

  const items = value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length ? items : undefined;
};

export const diagnosticSchema = z
  .object({
    job_id: z.string().uuid('Select a valid job.'),
    symptom: z.preprocess(emptyToUndefined, z.string().max(160).optional()),
    obd_code: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .trim()
        .toUpperCase()
        .max(20)
        .regex(/^[A-Z0-9-]+$/, 'Use letters, numbers, or dashes only.')
        .optional(),
    ),
    likely_causes: z.preprocess(parseLines, z.array(z.string().min(1).max(240)).max(20).optional()),
    suggested_tests: z.preprocess(parseLines, z.array(z.string().min(1).max(240)).max(20).optional()),
    tech_notes: z.preprocess(emptyToUndefined, z.string().max(4000).optional()),
  })
  .refine(
    (value) =>
      Boolean(
        value.symptom ||
          value.obd_code ||
          value.tech_notes ||
          value.likely_causes?.length ||
          value.suggested_tests?.length,
      ),
    {
      message: 'Add at least one diagnostic detail.',
      path: ['tech_notes'],
    },
  );

export const diagnosticIdSchema = z.string().uuid('Invalid diagnostic entry id.');

export type DiagnosticInput = z.infer<typeof diagnosticSchema>;

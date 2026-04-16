import { z } from 'zod';

const emptyToUndefined = (value: unknown) => {
  if (value == null) {
    return undefined;
  }

  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

export const jobStatusOptions = [
  'new lead',
  'scheduled',
  'waiting on deposit',
  'waiting on parts',
  'in progress',
  'completed',
  'payment pending',
] as const;

export const paymentMethodOptions = ['cash', 'card', 'cashapp', 'venmo', 'other'] as const;

export const jobSchema = z.object({
  customer_id: z.string().uuid('Select a valid customer.'),
  vehicle_id: z.string().uuid('Select a valid vehicle.'),
  title: z.preprocess(emptyToUndefined, z.string().max(160).optional()),
  complaint: z.string().trim().min(1, 'Complaint is required.'),
  diagnosis_notes: z.preprocess(emptyToUndefined, z.string().max(4000).optional()),
  recommended_tests: z.preprocess(emptyToUndefined, z.string().max(4000).optional()),
  repair_performed: z.preprocess(emptyToUndefined, z.string().max(4000).optional()),
  status: z.enum(jobStatusOptions),
  labor_amount: z.coerce.number().nonnegative().default(0),
  parts_amount: z.coerce.number().nonnegative().default(0),
  initial_deposit: z.preprocess(emptyToUndefined, z.coerce.number().nonnegative().optional()),
  initial_payment_method: z.preprocess(emptyToUndefined, z.enum(paymentMethodOptions).default('other')),
  next_step: z.preprocess(emptyToUndefined, z.string().max(1000).optional()),
  warranty_text: z.preprocess(emptyToUndefined, z.string().max(1000).optional()),
  scheduled_for: z.preprocess(emptyToUndefined, z.string().optional()),
});

export const jobIdSchema = z.string().uuid('Invalid job id.');

export type JobInput = z.infer<typeof jobSchema>;

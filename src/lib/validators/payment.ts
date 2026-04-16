import { z } from 'zod';
import { paymentMethodOptions } from '@/lib/validators/job';

const emptyToUndefined = (value: unknown) => {
  if (value == null) return undefined;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

export const paymentSchema = z.object({
  job_id: z.string().uuid('Select a valid job.'),
  amount: z.coerce.number().positive('Payment amount must be greater than 0.'),
  payment_method: z.enum(paymentMethodOptions),
  note: z.preprocess(emptyToUndefined, z.string().max(1000).optional()),
  paid_at: z.preprocess(emptyToUndefined, z.string().optional()),
});

export const paymentIdSchema = z.string().uuid('Invalid payment id.');

export type PaymentInput = z.infer<typeof paymentSchema>;

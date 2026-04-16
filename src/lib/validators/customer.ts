import { z } from 'zod';

const emptyToUndefined = (value: unknown) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

export const customerSchema = z.object({
  full_name: z.string().trim().min(1, 'Customer name is required.'),
  phone: z.string().trim().min(1, 'Phone is required.'),
  email: z.preprocess(emptyToUndefined, z.string().email('Enter a valid email.').optional()),
  area: z.preprocess(emptyToUndefined, z.string().max(120).optional()),
  preferred_contact: z.enum(['text', 'call', 'email', 'either']).default('text'),
  notes: z.preprocess(emptyToUndefined, z.string().max(2000).optional()),
});

export const customerIdSchema = z.string().uuid('Invalid customer id.');

export type CustomerInput = z.infer<typeof customerSchema>;

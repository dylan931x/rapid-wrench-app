import { z } from 'zod';

const emptyToUndefined = (value: unknown) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

export const profileSettingsSchema = z.object({
  business_name: z.string().trim().min(1, 'Business name is required.'),
  owner_name: z.preprocess(emptyToUndefined, z.string().max(160).optional()),
  phone: z.preprocess(emptyToUndefined, z.string().max(40).optional()),
  email: z.preprocess(emptyToUndefined, z.string().email('Enter a valid email.').optional()),
  service_area: z.preprocess(emptyToUndefined, z.string().max(160).optional()),
});

export const businessSettingsSchema = z.object({
  default_warranty_text: z.string().trim().min(1, 'Warranty text is required.'),
  default_policy_text: z.string().trim().min(1, 'Policy text is required.'),
  invoice_footer_text: z.preprocess(emptyToUndefined, z.string().max(4000).optional()),
  require_deposit: z.coerce.boolean().default(false),
});

export type ProfileSettingsInput = z.infer<typeof profileSettingsSchema>;
export type BusinessSettingsInput = z.infer<typeof businessSettingsSchema>;

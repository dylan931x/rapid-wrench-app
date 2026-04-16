import { z } from 'zod';

const emptyToUndefined = (value: unknown) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

export const vehicleSchema = z.object({
  customer_id: z.string().uuid('Select a valid customer.'),
  year: z.coerce.number().int().min(1900, 'Enter a valid year.').max(2100, 'Enter a valid year.'),
  make: z.string().trim().min(1, 'Make is required.'),
  model: z.string().trim().min(1, 'Model is required.'),
  engine: z.preprocess(emptyToUndefined, z.string().max(120).optional()),
  vin: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(17, 'VIN must be 17 characters or fewer.').optional(),
  ),
  mileage: z.preprocess(emptyToUndefined, z.coerce.number().int().nonnegative('Mileage cannot be negative.').optional()),
  license_plate: z.preprocess(emptyToUndefined, z.string().max(40).optional()),
  color: z.preprocess(emptyToUndefined, z.string().max(40).optional()),
  notes: z.preprocess(emptyToUndefined, z.string().max(2000).optional()),
});

export const vehicleIdSchema = z.string().uuid('Invalid vehicle id.');

export type VehicleInput = z.infer<typeof vehicleSchema>;

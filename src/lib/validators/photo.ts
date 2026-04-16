import { z } from 'zod';

export const photoIdSchema = z.uuid();
export const photoJobIdSchema = z.uuid();
export const photoCaptionSchema = z
  .string()
  .trim()
  .max(200, 'Caption must be 200 characters or less.')
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

import { z } from 'zod';

export const rfcSchema = z.object({
  rfc: z
    .string()
    .min(12, 'El RFC debe tener 12 o 13 caracteres')
    .max(13, 'El RFC debe tener 12 o 13 caracteres')
    .regex(/^[A-Za-z0-9]+$/, 'El RFC solo debe contener letras y números'),
});

export type RfcFormValues = z.infer<typeof rfcSchema>;

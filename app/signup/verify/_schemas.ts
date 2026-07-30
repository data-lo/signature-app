import { z } from 'zod';

export const verifyOtpSchema = z.object({
  code: z
    .string()
    .length(6, 'El código debe tener 6 dígitos')
    .regex(/^\d+$/, 'El código solo debe contener números'),
});

export type VerifyOtpFormValues = z.infer<typeof verifyOtpSchema>;

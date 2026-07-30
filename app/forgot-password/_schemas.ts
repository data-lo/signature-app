import { z } from 'zod';

export const emailStepSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo es obligatorio')
    .email('Correo electrónico inválido'),
});
export type EmailStepFormValues = z.infer<typeof emailStepSchema>;

export const otpStepSchema = z.object({
  code: z
    .string()
    .length(6, 'El código debe tener 6 dígitos')
    .regex(/^\d+$/, 'El código solo debe contener números'),
});
export type OtpStepFormValues = z.infer<typeof otpStepSchema>;

export const resetStepSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirma tu nueva contraseña'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });
export type ResetStepFormValues = z.infer<typeof resetStepSchema>;

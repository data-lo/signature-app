import { z } from 'zod';

export const registerSchema = z
  .object({
    firstName: z.string().min(1, 'El nombre es obligatorio'),
    lastName: z.string().min(1, 'El apellido es obligatorio'),
    email: z
      .string()
      .min(1, 'El correo es obligatorio')
      .email('Correo electrónico inválido'),
    nationalId: z.string().length(18, 'El CURP debe tener 18 caracteres'),
    rfc: z
      .string()
      .min(12, 'El RFC debe tener 12 o 13 caracteres')
      .max(13, 'El RFC debe tener 12 o 13 caracteres')
      .regex(/^[A-Za-z0-9]+$/, 'El RFC solo debe contener letras y números'),
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

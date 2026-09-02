import { z } from 'zod';

// Espeja los límites reales del backend (src/shared/constants/file-upload.constants.ts en
// signature-server): 10MB para imágenes de buena calidad, 20MB para PDFs de buena calidad —
// la INE acepta ambos formatos, así que usa el límite más generoso de los dos.
const MAX_INE_SIZE_BYTES = 20 * 1024 * 1024;
const MAX_SIGNATURE_SIZE_BYTES = 10 * 1024 * 1024;

const INE_ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
];

export const ineFileSchema = z
  .instanceof(File, { message: 'La identificación (INE) es obligatoria' })
  .refine((file) => INE_ALLOWED_TYPES.includes(file.type), {
    message: 'La identificación debe estar en formato PDF, JPG o PNG',
  })
  .refine((file) => file.size <= MAX_INE_SIZE_BYTES, {
    message: 'La identificación debe pesar menos de 20MB',
  });

export const signatureFileSchema = z
  .instanceof(File, { message: 'La firma digital es obligatoria' })
  .refine((file) => file.type === 'image/png', {
    message: 'La firma debe estar en formato PNG',
  })
  .refine((file) => file.size <= MAX_SIGNATURE_SIZE_BYTES, {
    message: 'La firma debe pesar menos de 10MB',
  });

export const personalDocumentsSchema = z.object({
  ineFile: ineFileSchema.optional(),
  signatureFile: signatureFileSchema,
});

export type PersonalDocumentsFormValues = z.infer<
  typeof personalDocumentsSchema
>;

export const updatePersonalInfoSchema = z.object({
  phoneNumber: z
    .string()
    .trim()
    .regex(/^[0-9]{7,15}$/, {
      message: 'El teléfono debe tener entre 7 y 15 dígitos',
    }),
  secondaryEmail: z
    .string()
    .trim()
    .email({ message: 'Correo electrónico inválido' }),
});

export type UpdatePersonalInfoFormValues = z.infer<
  typeof updatePersonalInfoSchema
>;

/**
 * Cambio de contraseña desde configuración. La contraseña actual solo se exige presente: quién
 * decide si es la correcta es el backend, y adelantar acá cualquier regla de forma sobre ella
 * dejaría fuera a quien se registró antes de que esa regla existiera.
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Ingresa tu contraseña actual'),
    newPassword: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirma tu nueva contraseña'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

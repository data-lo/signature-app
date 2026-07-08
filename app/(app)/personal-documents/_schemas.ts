import { z } from 'zod';

const MAX_INE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_SIGNATURE_SIZE_BYTES = 5 * 1024 * 1024;

const INE_ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

export const ineFileSchema = z
  .instanceof(File, { message: 'La identificación (INE) es obligatoria' })
  .refine((file) => INE_ALLOWED_TYPES.includes(file.type), {
    message: 'La identificación debe estar en formato PDF, JPG o PNG',
  })
  .refine((file) => file.size <= MAX_INE_SIZE_BYTES, {
    message: 'La identificación debe pesar menos de 5MB',
  });

export const signatureFileSchema = z
  .instanceof(File, { message: 'La firma digital es obligatoria' })
  .refine((file) => file.type === 'image/png', {
    message: 'La firma debe estar en formato PNG',
  })
  .refine((file) => file.size <= MAX_SIGNATURE_SIZE_BYTES, {
    message: 'La firma debe pesar menos de 5MB',
  });

export const personalDocumentsSchema = z.object({
  ineFile: ineFileSchema,
  signatureFile: signatureFileSchema,
});

export type PersonalDocumentsFormValues = z.infer<typeof personalDocumentsSchema>;

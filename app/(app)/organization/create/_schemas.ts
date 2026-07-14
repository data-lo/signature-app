import { z } from 'zod';

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(1, { message: 'El nombre es obligatorio' }),
  organizationName: z
    .string()
    .trim()
    .min(1, { message: 'La razón social es obligatoria' }),
});

export type CreateOrganizationFormValues = z.infer<
  typeof createOrganizationSchema
>;

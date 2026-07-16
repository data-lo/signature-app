import { z } from 'zod';

export const inviteMemberSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo es obligatorio')
    .email('Correo electrónico inválido'),
  roleId: z.string().min(1, 'Selecciona un rol'),
});

export type InviteMemberFormValues = z.infer<typeof inviteMemberSchema>;

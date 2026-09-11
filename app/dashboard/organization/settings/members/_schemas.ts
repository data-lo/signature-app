import { z } from 'zod';

export const inviteMemberSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo es obligatorio')
    .email('Correo electrónico inválido'),
  roleId: z.string().min(1, 'Selecciona un rol'),
});

export type InviteMemberFormValues = z.infer<typeof inviteMemberSchema>;

/**
 * Alta directa de alguien que ya tiene cuenta. Mismo par correo+rol que la invitación —el rol es
 * lo que define sus permisos— más el puesto, que aquí sí se conoce porque lo captura quien
 * administra y no el propio invitado.
 */
export const addMemberSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo es obligatorio')
    .email('Correo electrónico inválido'),
  roleId: z.string().min(1, 'Selecciona un rol'),
  position: z.string().optional(),
});

export type AddMemberFormValues = z.infer<typeof addMemberSchema>;

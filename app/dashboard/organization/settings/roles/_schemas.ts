import { z } from 'zod';

/**
 * Espejo de `STATIC_PERMISSION_KEY_ENUM` en el backend
 * (`signature-server/src/roles/static-permission-catalog.ts`) — los siete permisos técnicos que
 * un rol personalizado puede otorgar.
 */
export const STATIC_PERMISSION_KEYS = [
  'DOCUMENT.CREATE',
  'DOCUMENT.READ_OWN',
  'DOCUMENT.READ_ORGANIZATION',
  'DOCUMENT.SEND_SIGNATURE_REQUEST',
  'DOCUMENT.SIGN_SELF',
  'DOCUMENT.APPROVE',
  'MEMBER.INVITE',
] as const;

export type StaticPermissionKey = (typeof STATIC_PERMISSION_KEYS)[number];

export const saveOrganizationRoleSchema = z.object({
  name: z.string().trim().min(1, { message: 'El nombre es obligatorio' }),
  permissionKeys: z.array(z.enum(STATIC_PERMISSION_KEYS)),
});

export type SaveOrganizationRoleFormValues = z.infer<
  typeof saveOrganizationRoleSchema
>;

/** Filtra y tipa las claves que de verdad pertenecen al catálogo estático (ver `isStaticCatalog` en el backend). */
export function isStaticPermissionKey(key: string): key is StaticPermissionKey {
  return (STATIC_PERMISSION_KEYS as readonly string[]).includes(key);
}

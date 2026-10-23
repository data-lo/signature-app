import { z } from 'zod';
import type { RolePermission } from '@/lib/api/organization-roles';

/**
 * Formulario de un rol personalizado: su nombre y las claves del catálogo estático que otorga.
 *
 * `permissionKeys` se valida como cadenas y NO contra una lista fija. Antes vivía acá un espejo de
 * `STATIC_PERMISSION_KEY_ENUM` del backend, y cada permiso nuevo del catálogo había que copiarlo a
 * mano: mientras no se copiara, el checkbox se dibujaba (la lista de opciones sí viene de la API)
 * pero el formulario rechazaba guardarlo, sin decir por qué. Las opciones que se ofrecen salen del
 * catálogo que publica la API —`isStaticCatalog`— y quien decide si una clave es válida de verdad
 * es el backend, que valida contra su propio enum.
 */
export const saveOrganizationRoleSchema = z.object({
  name: z.string().trim().min(1, { message: 'El nombre es obligatorio' }),
  permissionKeys: z.array(z.string()),
});

export type SaveOrganizationRoleFormValues = z.infer<
  typeof saveOrganizationRoleSchema
>;

/**
 * Filtra los permisos de un rol dejando sólo los del catálogo estático, que son los que el
 * formulario puede ofrecer y guardar.
 *
 * La marca la pone el backend en cada permiso (`isStaticCatalog`), así que la rejilla CRUD
 * heredada del seed anterior queda fuera sin que el frontend sepa qué claves existen.
 *
 * @param permissions - Permisos tal como los devuelve la API para un rol.
 * @returns Las claves del catálogo estático, en el orden en que llegaron.
 *
 * @example
 * ```ts
 * staticPermissionKeysOf(role.permissions); // ['DOCUMENT.CREATE', 'MEMBER.INVITE']
 * ```
 */
export function staticPermissionKeysOf(
  permissions: RolePermission[],
): string[] {
  return permissions
    .filter((permission) => permission.isStaticCatalog)
    .map((permission) => permission.key);
}

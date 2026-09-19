import type { OrganizationRole } from '@/lib/api/organization-roles';

/** Nombre del rol de sistema del propietario, tal como lo publica la API. */
export const OWNER_ROLE_NAME = 'OWNER';

/**
 * Los roles que se pueden elegir al invitar a alguien: todos menos el OWNER de sistema.
 *
 * OWNER no se reparte. Lo recibe automáticamente quien crea la cuenta, y es lo que distingue al
 * dueño de un administrador nombrado por él; para delegar la administración está ADMIN.
 *
 * Se filtra por la CLAVE del rol —el `name` de un rol de sistema, que es el identificador que
 * guarda el backend— y no por el texto que se ve. "PROPIETARIO" es sólo cómo se pinta ese mismo
 * rol en pantalla (ver `SYSTEM_ROLE_LABELS`); la API nunca lo manda como nombre, así que excluir
 * OWNER ya lo excluye. Filtrar también por "PROPIETARIO" escondería en silencio un rol
 * personalizado que una organización hubiera llamado así.
 *
 * Es protección de PRESENTACIÓN: el backend rechaza igual una invitación con el rol OWNER.
 *
 * @param roles - Roles de la organización; `undefined` mientras cargan.
 * @returns Los roles asignables, en el mismo orden en que llegaron.
 *
 * @example
 * ```ts
 * assignableMemberRoles([owner, admin, member]); // [admin, member]
 * ```
 */
export function assignableMemberRoles(
  roles: readonly OrganizationRole[] | undefined,
): OrganizationRole[] {
  return (roles ?? []).filter(
    (role) => !(role.isSystemRole && role.name === OWNER_ROLE_NAME),
  );
}

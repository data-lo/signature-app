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

/**
 * Por qué no se ofrecen "Desactivar" ni "Editar Rol" sobre el propietario (historia "Impedir
 * desactivación de cuentas con perfil Owner"). El backend lo rechaza igual con un 409; esto es
 * lo que ve el usuario antes de intentarlo.
 */
export const OWNER_CANNOT_BE_DEACTIVATED_MESSAGE =
  'La cuenta del propietario (Owner) no se puede desactivar.';
export const OWNER_ROLE_CANNOT_CHANGE_MESSAGE =
  'El rol del propietario (Owner) no se puede cambiar.';

/**
 * Si la membresía es la del propietario de la organización.
 *
 * Mira sólo el nombre porque es lo único que trae el listado de miembros; basta para decidir qué
 * se ofrece en pantalla. Quien de verdad decide es el backend, que compara contra el id del rol
 * de sistema.
 *
 * @param member - Miembro del listado (sólo se lee su rol).
 * @returns `true` si su rol es OWNER.
 *
 * @example
 * ```ts
 * isOwnerMember({ role: { id: 'r1', name: 'OWNER' } }); // true
 * ```
 */
export function isOwnerMember(member: {
  role: { name: string } | null;
}): boolean {
  return member.role?.name === OWNER_ROLE_NAME;
}

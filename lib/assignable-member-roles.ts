import type { RoleData } from '@/lib/api/roles';

/**
 * Nombre del rol de sistema del propietario de la cuenta, tal como lo publica `GET /api/v1/roles`.
 */
export const OWNER_ROLE_NAME = 'OWNER';

/**
 * Los roles que se pueden elegir al invitar o agregar a alguien a una organización: todos menos
 * OWNER.
 *
 * OWNER no se reparte: es el rol que recibe automáticamente quien crea la cuenta, y distingue al
 * dueño de un administrador que él nombró. Ofrecerlo en el alta permitiría convertir en
 * propietario a cualquiera con sólo invitarlo. Para delegar la administración está ADMIN.
 *
 * Sólo filtra lo que se OFRECE. Las membresías que ya son OWNER siguen igual, y la pantalla de
 * miembros las sigue mostrando con su rol.
 *
 * @param roles - Catálogo de roles tal como llega del backend; `undefined` mientras carga.
 * @returns Los roles asignables, en el mismo orden en que llegaron.
 *
 * @example
 * ```ts
 * assignableMemberRoles([owner, admin, member]); // [admin, member]
 * assignableMemberRoles(undefined); // []
 * ```
 */
export function assignableMemberRoles(roles: readonly RoleData[] | undefined): RoleData[] {
  return (roles ?? []).filter((role) => role.name !== OWNER_ROLE_NAME);
}

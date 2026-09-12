'use server';

import { backendRequest } from '@/lib/server/backend-request';
import type { OrganizationPermission } from '@/lib/api/organization-permissions';

/**
 * Catálogo de etiquetas propias de la organización.
 *
 * Se trae en el mismo render que los miembros —y no cuando se abre el modal de asignación— para
 * que el navegador no tenga que pedirlo cuando el administrador ya está esperando a que se abra
 * una ventana. Es un catálogo corto y estable, así que viaja completo como props.
 *
 * Ojo con el nombre: son etiquetas informativas del catálogo de cada organización, un sistema
 * PARALELO al RBAC. Los permisos que de verdad habilitan acciones son los del rol, y esos vienen
 * dentro de cada miembro.
 *
 * @param organizationId - Organización cuyo catálogo se consulta.
 * @returns Las etiquetas del catálogo, serializables.
 * @throws {BackendRequestError} Si no hay sesión (401), si el llamador no pertenece a esa
 * organización (403) o si el backend falla.
 *
 * @example
 * ```ts
 * const permissions = await getOrganizationPermissionsAction('org-1');
 * permissions.filter((permission) => permission.isActive);
 * ```
 */
export async function getOrganizationPermissionsAction(
  organizationId: string,
): Promise<OrganizationPermission[]> {
  return backendRequest<OrganizationPermission[]>(
    `organizations/${organizationId}/permissions`,
  );
}

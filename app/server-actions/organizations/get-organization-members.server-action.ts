'use server';

import { backendRequest } from '@/lib/server/backend-request';
import type { OrganizationMember } from '@/lib/api/organization-members';

/**
 * Miembros de una organización, con su rol, su estado y los permisos que hereda de ese rol.
 *
 * La organización va en la URL del backend y la sesión en la cookie: `GET
 * /organizations/:organizationId/members` valida con el `sub` del JWT que quien pregunta sea
 * miembro con permiso de lectura, así que un `organizationId` ajeno responde 403 en lugar de
 * devolver datos. Por eso este Server Action no comprueba pertenencia por su cuenta: la
 * comprobación final vive donde tiene que vivir, y duplicarla aquí sólo daría una segunda verdad
 * que puede quedarse vieja.
 *
 * @param organizationId - Organización a consultar, tal como viene en la ruta de la sección.
 * @param includeInactive - `true` para incluir también las membresías dadas de baja.
 * @returns La lista de miembros, ya serializable para pasarla a componentes cliente.
 * @throws {BackendRequestError} Si no hay sesión (401), si el llamador no tiene acceso a esa
 * organización (403) o si el backend falla.
 *
 * @example
 * ```ts
 * const members = await getOrganizationMembersAction('org-1');
 * members.length === 0; // la sección muestra el estado vacío
 * ```
 */
export async function getOrganizationMembersAction(
  organizationId: string,
  includeInactive = false,
): Promise<OrganizationMember[]> {
  return backendRequest<OrganizationMember[]>(
    `organizations/${organizationId}/members`,
    {
      searchParams: includeInactive ? { includeInactive: 'true' } : undefined,
    },
  );
}

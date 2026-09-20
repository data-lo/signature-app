import apiClient from '@/lib/axios';
import type { RolePermission } from '@/lib/api/roles';

export interface OrganizationMemberRole {
  id: string;
  name: string;
}

/** Espeja `ACCOUNT_STATUS_ENUM` del backend. */
export type OrganizationMemberStatus =
  'pending_invite' | 'active' | 'suspended' | 'removed';

export interface OrganizationMember {
  accountId: string;
  userId: string;
  email: string;
  rfc: string | null;
  role: OrganizationMemberRole | null;
  joinedAt: string | null;
  status: OrganizationMemberStatus;
  isActive: boolean;
  /**
   * Permisos que el miembro tiene HOY por su rol. Son informativos: la aplicación efectiva del
   * RBAC en documentos, firmas y aprobaciones es una historia posterior.
   */
  permissions: RolePermission[];
}

export interface AddOrganizationMemberValues {
  email: string;
  roleId: string;
  position?: string;
}

/**
 * Miembros de una organización, tal como los publica
 * `GET /api/v1/organizations/:organizationId/members`, pedidos desde el navegador.
 *
 * Convive con `getOrganizationMembersAction` sin sustituirlo: aquél sirve la carga inicial de la
 * sección de miembros, que se renderiza en el servidor; éste existe para la consulta perezosa que
 * dispara marcar "Requiere aprobación" al crear un documento, que se resuelve con TanStack Query
 * (ver `useDocumentApprovers`).
 *
 * @param organizationId - Organización cuyos miembros se listan.
 * @returns Los miembros activos con su rol, su estado y los permisos que heredan de ese rol.
 *
 * @throws {AxiosError} Si no hay sesión (401), si el llamador no tiene `MEMBER.READ` en esa
 * organización (403) o si el backend falla.
 *
 * @example
 * ```ts
 * const members = await getOrganizationMembersRequest('org-1');
 * ```
 */
export async function getOrganizationMembersRequest(
  organizationId: string,
): Promise<OrganizationMember[]> {
  const { data } = await apiClient.get<{
    success: boolean;
    message: string;
    data: OrganizationMember[];
  }>(`/api/v1/organizations/${organizationId}/members`);

  return data.data;
}

/*
  Las demás funciones que pedían y modificaban miembros desde el navegador
  `addOrganizationMember`, `updateMemberRole`, `removeMember`) se fueron con la migración de la
  pantalla a renderizado en el servidor: ahora esas llamadas salen del servidor de Next, con la
  cookie de sesión, desde `app/server-actions/organizations/`. Los tipos se quedan porque los usan
  tanto los Server Actions como los componentes cliente que reciben los datos ya resueltos.
*/

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

export async function getOrganizationMembersRequest(
  organizationId: string,
  includeInactive = false,
): Promise<OrganizationMember[]> {
  const { data } = await apiClient.get<{
    success: boolean;
    message: string;
    data: OrganizationMember[];
  }>(`/api/v1/organizations/${organizationId}/members`, {
    params: includeInactive ? { includeInactive: true } : undefined,
  });

  return data.data;
}

/**
 * Alta directa de alguien que YA tiene cuenta. La organización la resuelve el backend desde el
 * header `X-Account-Id` que inyecta el cliente de axios, así que aquí no se manda ningún
 * identificador de organización: es lo que impide dar de alta en una organización ajena.
 */
export async function addOrganizationMemberRequest(
  values: AddOrganizationMemberValues,
): Promise<OrganizationMember> {
  const { data } = await apiClient.post<{
    success: boolean;
    message: string;
    data: OrganizationMember;
  }>('/api/v1/organizations/members', values);

  return data.data;
}

export async function updateMemberRoleRequest(
  accountId: string,
  roleId: string,
): Promise<void> {
  await apiClient.patch(`/api/v1/organizations/members/${accountId}/role`, {
    roleId,
  });
}

export async function removeMemberRequest(accountId: string): Promise<void> {
  await apiClient.delete(`/api/v1/organizations/members/${accountId}`);
}

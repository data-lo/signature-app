import apiClient from '@/lib/axios';
import type { RolePermission } from '@/lib/api/roles';

export type { RolePermission };

/**
 * Un rol tal como lo devuelve `GET /organizations/:id/roles` — espejo de `RoleData` en el
 * backend (`src/roles/interfaces/response/role-response.ts`).
 */
export interface OrganizationRole {
  id: string;
  name: string;
  isSystemRole: boolean;
  permissions: RolePermission[];
  createdAt: string;
}

export interface SaveOrganizationRoleValues {
  name: string;
  permissionKeys: string[];
}

export async function getOrganizationRolesRequest(
  organizationId: string,
): Promise<OrganizationRole[]> {
  const { data } = await apiClient.get<{
    success: boolean;
    message: string;
    data: OrganizationRole[];
  }>(`/api/v1/organizations/${organizationId}/roles`);

  return data.data;
}

export async function createOrganizationRoleRequest(
  organizationId: string,
  values: SaveOrganizationRoleValues,
): Promise<OrganizationRole> {
  const { data } = await apiClient.post<{
    success: boolean;
    message: string;
    data: OrganizationRole;
  }>(`/api/v1/organizations/${organizationId}/roles`, values);

  return data.data;
}

export async function updateOrganizationRoleRequest(
  organizationId: string,
  roleId: string,
  changes: Partial<SaveOrganizationRoleValues>,
): Promise<OrganizationRole> {
  const { data } = await apiClient.patch<{
    success: boolean;
    message: string;
    data: OrganizationRole;
  }>(`/api/v1/organizations/${organizationId}/roles/${roleId}`, changes);

  return data.data;
}

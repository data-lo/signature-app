import apiClient from '@/lib/axios';

export interface OrganizationPermission {
  id: string;
  organizationId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export async function getOrganizationPermissionsRequest(
  organizationId: string,
): Promise<OrganizationPermission[]> {
  const { data } = await apiClient.get<{
    success: boolean;
    message: string;
    data: OrganizationPermission[];
  }>(`/api/v1/organizations/${organizationId}/permissions`);

  return data.data;
}

export async function createOrganizationPermissionRequest(
  organizationId: string,
  name: string,
): Promise<void> {
  await apiClient.post(`/api/v1/organizations/${organizationId}/permissions`, {
    name,
  });
}

export async function updateOrganizationPermissionRequest(
  organizationId: string,
  permissionId: string,
  changes: { name?: string; isActive?: boolean },
): Promise<void> {
  await apiClient.patch(
    `/api/v1/organizations/${organizationId}/permissions/${permissionId}`,
    changes,
  );
}

export async function deleteOrganizationPermissionRequest(
  organizationId: string,
  permissionId: string,
): Promise<void> {
  await apiClient.delete(
    `/api/v1/organizations/${organizationId}/permissions/${permissionId}`,
  );
}

/*
  Aquí vivían `getMemberPermissionsRequest` y `updateMemberPermissionsRequest`, las etiquetas del
  catálogo asignadas a UNA membresía. Se fueron con la opción "Etiquetas del catálogo" del menú de
  Administrar miembros, que era su único consumidor. Lo que queda es el catálogo de la
  organización, que administra la pantalla "Roles y permisos"; los endpoints por membresía siguen
  existiendo en el backend, sin cliente en esta aplicación.
*/

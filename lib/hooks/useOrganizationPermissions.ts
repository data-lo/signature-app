import { useQuery } from '@tanstack/react-query';
import { getOrganizationPermissionsRequest } from '@/lib/api/organization-permissions';

/**
 * Catálogo de permisos de la organización — consumido tanto por la pestaña Permisos
 * (organization/settings/permissions) como por el modal de asignación en Administrar miembros,
 * de ahí que viva en `lib/` en vez de en los `_hooks` privados de una sola feature (mismo
 * criterio que `useSystemRoles`).
 */
export function useOrganizationPermissions(
  organizationId: string | null,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['organizationPermissions', organizationId],
    queryFn: () => getOrganizationPermissionsRequest(organizationId as string),
    enabled: enabled && !!organizationId,
  });
}

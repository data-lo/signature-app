import { useQuery } from '@tanstack/react-query';
import { getOrganizationPermissionsRequest } from '@/lib/api/organization-permissions';

/**
 * Catálogo de permisos de la organización, para la pantalla de Permisos.
 *
 * Ya no lo consume el modal de asignación de Administrar miembros: esa sección se renderiza en el
 * servidor y le pasa el catálogo por props, así que abrir el modal no dispara ninguna consulta.
 * Sigue viviendo en `lib/` —y no en los `_hooks` privados de Permisos— porque es un catálogo de
 * organización y no de una sola pantalla, mismo criterio que `useSystemRoles`.
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

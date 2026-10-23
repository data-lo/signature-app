import { useQuery } from '@tanstack/react-query';
import { getOrganizationRolesRequest } from '@/lib/api/organization-roles';

/**
 * Llave del catálogo de roles de una organización. Se exporta para que quien cree o edite un rol
 * invalide exactamente esta consulta.
 *
 * @param organizationId - Organización cuyos roles se piden.
 * @returns La llave de React Query.
 *
 * @example
 * ```ts
 * queryClient.invalidateQueries({ queryKey: organizationRolesQueryKey('org-1') });
 * ```
 */
export function organizationRolesQueryKey(organizationId: string | null) {
  return ['organizationRoles', organizationId] as const;
}

/**
 * Roles que puede asignar una organización: los de sistema más los propios de ella
 * (`GET /organizations/:organizationId/roles`).
 *
 * Vive en `lib/hooks` y no dentro de una pantalla porque lo usan dos: la de Roles y el modal de
 * invitar. Compartir la llave hace que un rol recién creado aparezca en el modal sin recargar.
 *
 * @param organizationId - Organización cuyos roles se piden; `null` no consulta.
 * @param enabled - Si la consulta debe correr. El modal lo ata a estar abierto, para no pedir
 *   roles que nadie va a ver.
 * @returns La consulta de TanStack Query.
 *
 * @example
 * ```ts
 * const rolesQuery = useOrganizationRoles(organizationId, open);
 * ```
 */
export function useOrganizationRoles(
  organizationId: string | null,
  enabled: boolean,
) {
  return useQuery({
    queryKey: organizationRolesQueryKey(organizationId),
    queryFn: () => getOrganizationRolesRequest(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}

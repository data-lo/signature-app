import { useQuery } from '@tanstack/react-query';

import { getOrganizationRequest } from '@/lib/api/organizations';

/**
 * Llave del perfil de una organización. Se exporta para que quien lo edite invalide exactamente
 * esta consulta.
 *
 * @param organizationId - Organización cuyo perfil se pide.
 * @returns La llave de React Query.
 *
 * @example
 * ```ts
 * queryClient.invalidateQueries({ queryKey: organizationQueryKey('org-1') });
 * ```
 */
export function organizationQueryKey(organizationId: string | null) {
  return ['organization', organizationId] as const;
}

/**
 * Perfil de una organización (`GET /organizations/:organizationId`).
 *
 * @param organizationId - Organización cuyo perfil se pide; `null` no consulta.
 * @param enabled - Si la consulta debe correr. La pantalla lo ata al permiso de lectura, para no
 *   pedir algo que el backend va a rechazar con 403.
 * @returns La consulta de TanStack Query.
 *
 * @example
 * ```ts
 * const organizationQuery = useOrganization(organizationId, canReadOrganization);
 * ```
 */
export function useOrganization(
  organizationId: string | null,
  enabled: boolean,
) {
  return useQuery({
    queryKey: organizationQueryKey(organizationId),
    queryFn: () => getOrganizationRequest(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}

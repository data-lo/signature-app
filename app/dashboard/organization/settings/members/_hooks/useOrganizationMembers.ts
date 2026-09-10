import { useQuery } from '@tanstack/react-query';
import { getOrganizationMembersRequest } from '@/lib/api/organization-members';

/**
 * Miembros de la organización activa, con su rol, su estado y los permisos que hereda del rol.
 *
 * `includeInactive` entra en la `queryKey` porque cambia el conjunto devuelto: sin él, alternar el
 * filtro mostraría la lista cacheada de la otra vista hasta que la petición volviera.
 *
 * @param organizationId - Organización activa; sin ella la consulta no se dispara.
 * @param enabled - Si el llamador puede administrar miembros (evita pedirlo a quien recibirá 403).
 * @param includeInactive - `true` para incluir también las membresías dadas de baja.
 * @returns La consulta de react-query con la lista de miembros.
 *
 * @example
 * ```ts
 * const { data: members } = useOrganizationMembers(organizationId, isAdmin, showInactive);
 * ```
 */
export function useOrganizationMembers(
  organizationId: string | null,
  enabled: boolean,
  includeInactive = false,
) {
  return useQuery({
    queryKey: ['organizationMembers', organizationId, { includeInactive }],
    queryFn: () =>
      getOrganizationMembersRequest(organizationId as string, includeInactive),
    enabled: enabled && !!organizationId,
  });
}

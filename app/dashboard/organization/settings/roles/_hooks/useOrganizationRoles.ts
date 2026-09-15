import { useQuery } from '@tanstack/react-query';
import { getOrganizationRolesRequest } from '@/lib/api/organization-roles';

export function useOrganizationRoles(
  organizationId: string | null,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['organizationRoles', organizationId],
    queryFn: () => getOrganizationRolesRequest(organizationId as string),
    enabled: enabled && !!organizationId,
  });
}

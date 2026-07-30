import { useQuery } from '@tanstack/react-query';
import { getOrganizationMembersRequest } from '@/lib/api/organization-members';

export function useOrganizationMembers(
  organizationId: string | null,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['organizationMembers', organizationId],
    queryFn: () => getOrganizationMembersRequest(organizationId as string),
    enabled: enabled && !!organizationId,
  });
}

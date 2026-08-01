import { useQuery } from '@tanstack/react-query';
import { getMemberPermissionsRequest } from '@/lib/api/organization-permissions';

export function useMemberPermissions(accountId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['memberPermissions', accountId],
    queryFn: () => getMemberPermissionsRequest(accountId as string),
    enabled: enabled && !!accountId,
  });
}

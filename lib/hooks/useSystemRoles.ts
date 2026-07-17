import { useQuery } from '@tanstack/react-query';
import { getSystemRolesRequest } from '@/lib/api/roles';

export function useSystemRoles(enabled = true) {
  return useQuery({
    queryKey: ['systemRoles'],
    queryFn: getSystemRolesRequest,
    enabled,
  });
}

import { useQuery } from '@tanstack/react-query';
import { getInvitationPreviewRequest } from '@/lib/api/organization-invitations';

export function useInvitationPreview(token: string | null) {
  return useQuery({
    queryKey: ['invitationPreview', token],
    queryFn: () => getInvitationPreviewRequest(token as string),
    enabled: !!token,
    retry: false,
  });
}

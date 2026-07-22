'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { removeMemberRequest } from '@/lib/api/organization-members';
import { getMemberActionErrorMessage } from './useUpdateMemberRole';

export function useRemoveMember(organizationId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (accountId: string) => removeMemberRequest(accountId),
    onSuccess: () => {
      toast.success('Miembro eliminado correctamente');
      queryClient.invalidateQueries({
        queryKey: ['organizationMembers', organizationId],
      });
    },
    onError: (error) => {
      console.error('[organization-members] falló eliminar al miembro:', error);
      toast.error(
        getMemberActionErrorMessage(
          error,
          'Ocurrió un error al eliminar al miembro. Intenta de nuevo.',
        ),
      );
    },
  });
}

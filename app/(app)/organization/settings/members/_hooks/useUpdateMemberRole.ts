'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { updateMemberRoleRequest } from '@/lib/api/organization-members';
import { getErrorMessage } from '@/lib/error-handler';

export function useUpdateMemberRole(organizationId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      accountId,
      roleId,
    }: {
      accountId: string;
      roleId: string;
    }) => updateMemberRoleRequest(accountId, roleId),
    onSuccess: () => {
      toast.success('Rol actualizado correctamente');
      queryClient.invalidateQueries({
        queryKey: ['organizationMembers', organizationId],
      });
    },
    onError: (error) => {
      console.error('[organization-members] falló actualizar el rol:', error);
      toast.error(
        getErrorMessage(
          error,
          'Ocurrió un error al actualizar el rol. Intenta de nuevo.',
        ),
      );
    },
  });
}

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/error-handler';
import { updateMemberPermissionsRequest } from '@/lib/api/organization-permissions';

export function useUpdateMemberPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      accountId,
      permissionIds,
    }: {
      accountId: string;
      permissionIds: string[];
    }) => updateMemberPermissionsRequest(accountId, permissionIds),
    onSuccess: (_data, variables) => {
      toast.success('Permisos actualizados correctamente');
      queryClient.invalidateQueries({
        queryKey: ['memberPermissions', variables.accountId],
      });
    },
    onError: (error) => {
      console.error(
        '[organization-members] falló actualizar los permisos del miembro:',
        error,
      );
      toast.error(
        getErrorMessage(
          error,
          'Ocurrió un error al actualizar los permisos. Intenta de nuevo.',
        ),
      );
    },
  });
}

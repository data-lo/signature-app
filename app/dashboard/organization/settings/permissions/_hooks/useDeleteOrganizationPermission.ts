'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/error-handler';
import { deleteOrganizationPermissionRequest } from '@/lib/api/organization-permissions';

export function useDeleteOrganizationPermission(organizationId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (permissionId: string) =>
      deleteOrganizationPermissionRequest(
        organizationId as string,
        permissionId,
      ),
    onSuccess: () => {
      toast.success('Permiso eliminado correctamente');
      queryClient.invalidateQueries({
        queryKey: ['organizationPermissions', organizationId],
      });
    },
    onError: (error) => {
      console.error(
        '[organization-permissions] falló eliminar el permiso:',
        error,
      );
      toast.error(
        getErrorMessage(
          error,
          'Ocurrió un error al eliminar el permiso. Intenta de nuevo.',
        ),
      );
    },
  });
}

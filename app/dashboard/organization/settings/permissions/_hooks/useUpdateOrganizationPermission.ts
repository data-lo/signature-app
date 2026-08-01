'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/error-handler';
import { updateOrganizationPermissionRequest } from '@/lib/api/organization-permissions';

export function useUpdateOrganizationPermission(organizationId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      permissionId,
      changes,
    }: {
      permissionId: string;
      changes: { name?: string; isActive?: boolean };
    }) =>
      updateOrganizationPermissionRequest(
        organizationId as string,
        permissionId,
        changes,
      ),
    onSuccess: () => {
      toast.success('Permiso actualizado correctamente');
      queryClient.invalidateQueries({
        queryKey: ['organizationPermissions', organizationId],
      });
    },
    onError: (error) => {
      console.error(
        '[organization-permissions] falló actualizar el permiso:',
        error,
      );
      toast.error(
        getErrorMessage(
          error,
          'Ocurrió un error al actualizar el permiso. Intenta de nuevo.',
        ),
      );
    },
  });
}

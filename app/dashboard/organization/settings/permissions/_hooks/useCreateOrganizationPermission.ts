'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/error-handler';
import { createOrganizationPermissionRequest } from '@/lib/api/organization-permissions';

export function useCreateOrganizationPermission(organizationId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) =>
      createOrganizationPermissionRequest(organizationId as string, name),
    onSuccess: () => {
      toast.success('Permiso creado correctamente');
      queryClient.invalidateQueries({
        queryKey: ['organizationPermissions', organizationId],
      });
    },
    onError: (error) => {
      console.error('[organization-permissions] falló crear el permiso:', error);
      toast.error(
        getErrorMessage(
          error,
          'Ocurrió un error al crear el permiso. Intenta de nuevo.',
        ),
      );
    },
  });
}

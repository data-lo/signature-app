'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationRolesQueryKey } from '@/lib/hooks/useOrganizationRoles';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/error-handler';
import {
  createOrganizationRoleRequest,
  type SaveOrganizationRoleValues,
} from '@/lib/api/organization-roles';
import { logSafeError } from '@/lib/observability/safe-log';

export function useCreateOrganizationRole(organizationId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: SaveOrganizationRoleValues) =>
      createOrganizationRoleRequest(organizationId as string, values),
    onSuccess: () => {
      toast.success('Rol creado correctamente');
      queryClient.invalidateQueries({
        queryKey: organizationRolesQueryKey(organizationId),
      });
    },
    onError: (error) => {
      logSafeError('[organization-roles] falló crear el rol', error);
      toast.error(
        getErrorMessage(
          error,
          'Ocurrió un error al crear el rol. Intenta de nuevo.',
        ),
      );
    },
  });
}

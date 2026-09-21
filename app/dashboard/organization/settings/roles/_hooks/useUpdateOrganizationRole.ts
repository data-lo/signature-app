'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationRolesQueryKey } from '@/lib/hooks/useOrganizationRoles';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/error-handler';
import {
  updateOrganizationRoleRequest,
  type SaveOrganizationRoleValues,
} from '@/lib/api/organization-roles';

export function useUpdateOrganizationRole(organizationId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      roleId,
      changes,
    }: {
      roleId: string;
      changes: Partial<SaveOrganizationRoleValues>;
    }) =>
      updateOrganizationRoleRequest(organizationId as string, roleId, changes),
    onSuccess: () => {
      toast.success('Rol actualizado correctamente');
      queryClient.invalidateQueries({
        queryKey: organizationRolesQueryKey(organizationId),
      });
    },
    onError: (error) => {
      console.error('[organization-roles] falló actualizar el rol:', error);
      toast.error(
        getErrorMessage(
          error,
          'Ocurrió un error al actualizar el rol. Intenta de nuevo.',
        ),
      );
    },
  });
}

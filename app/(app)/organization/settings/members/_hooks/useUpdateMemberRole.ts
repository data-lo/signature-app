'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { updateMemberRoleRequest } from '@/lib/api/organization-members';

export function getMemberActionErrorMessage(
  error: unknown,
  fallback: string,
): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  return axiosError.response?.data?.message ?? fallback;
}

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
        getMemberActionErrorMessage(
          error,
          'Ocurrió un error al actualizar el rol. Intenta de nuevo.',
        ),
      );
    },
  });
}

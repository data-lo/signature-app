'use client';

import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { inviteMemberRequest } from '@/lib/api/accounts';

function getErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  return (
    axiosError.response?.data?.message ??
    'Ocurrió un error al enviar la invitación. Intenta de nuevo.'
  );
}

export function useInviteMember() {
  return useMutation({
    mutationFn: inviteMemberRequest,
    onSuccess: () => {
      toast.success('Invitación enviada correctamente');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

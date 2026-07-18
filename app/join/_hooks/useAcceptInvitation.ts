'use client';

import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { acceptInvitationRequest } from '@/lib/api/organization-invitations';

function getErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  return (
    axiosError.response?.data?.message ??
    'Ocurrió un error al unirte a la organización. Intenta de nuevo.'
  );
}

export function useAcceptInvitation() {
  return useMutation({
    mutationFn: ({ token, rfc }: { token: string; rfc: string }) =>
      acceptInvitationRequest(token, rfc),
    onError: (error) => {
      console.error('[join] falló aceptar la invitación:', error);
      toast.error(getErrorMessage(error));
    },
  });
}

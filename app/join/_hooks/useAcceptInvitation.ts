'use client';

import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/error-handler';
import { acceptInvitationRequest } from '@/lib/api/organization-invitations';
import { getErrorMessage } from '@/lib/error-handler';

export function useAcceptInvitation() {
  return useMutation({
    mutationFn: ({ token, rfc }: { token: string; rfc: string }) =>
      acceptInvitationRequest(token, rfc),
    onError: (error) => {
      console.error('[join] falló aceptar la invitación:', error);
      toast.error(
        getErrorMessage(
          error,
          'Ocurrió un error al unirte a la organización. Intenta de nuevo.',
        ),
      );
    },
  });
}

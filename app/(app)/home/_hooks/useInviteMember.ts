'use client';

import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/error-handler';
import { inviteMemberRequest } from '@/lib/api/accounts';

export function useInviteMember() {
  return useMutation({
    mutationFn: inviteMemberRequest,
    onSuccess: () => {
      toast.success('Invitación enviada correctamente');
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(
          error,
          'Ocurrió un error al enviar la invitación. Intenta de nuevo.',
        ),
      );
    },
  });
}

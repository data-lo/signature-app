'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/error-handler';
import { requestVerificationCodeRequest } from '../_requests';

export function useRequestVerificationCode(documentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => requestVerificationCodeRequest(documentId),
    onSuccess: () => {
      toast.success('Código de verificación enviado a tu correo');
      queryClient.invalidateQueries({
        queryKey: ['documentDetail', documentId],
      });
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(
          error,
          'Ocurrió un error al solicitar el código de verificación. Intenta de nuevo.',
        ),
      );
    },
  });
}

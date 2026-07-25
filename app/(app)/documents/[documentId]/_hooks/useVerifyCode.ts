'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/error-handler';
import { verifyCodeRequest } from '../_requests';

export function useVerifyCode(documentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code: string) => verifyCodeRequest(documentId, code),
    onSuccess: () => {
      toast.success('Código verificado correctamente');
      queryClient.invalidateQueries({
        queryKey: ['documentDetail', documentId],
      });
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(error, 'Código de verificación inválido. Intenta de nuevo.'),
      );
    },
  });
}

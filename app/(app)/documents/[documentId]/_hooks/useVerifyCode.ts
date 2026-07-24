'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { verifyCodeRequest } from '../_requests';

function getErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  return (
    axiosError.response?.data?.message ??
    'Código de verificación inválido. Intenta de nuevo.'
  );
}

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
      toast.error(getErrorMessage(error));
    },
  });
}

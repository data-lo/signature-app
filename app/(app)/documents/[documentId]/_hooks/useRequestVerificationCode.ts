'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { requestVerificationCodeRequest } from '../_requests';

function getErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  return (
    axiosError.response?.data?.message ??
    'Ocurrió un error al solicitar el código de verificación. Intenta de nuevo.'
  );
}

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
      toast.error(getErrorMessage(error));
    },
  });
}

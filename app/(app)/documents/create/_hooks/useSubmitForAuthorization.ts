'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { submitForAuthorizationRequest } from '../_requests';

function getErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  return (
    axiosError.response?.data?.message ??
    'Ocurrió un error al enviar el documento a firma. Intenta de nuevo.'
  );
}

export function useSubmitForAuthorization() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitForAuthorizationRequest,
    onSuccess: () => {
      toast.success('Documento enviado a firma correctamente');
      queryClient.invalidateQueries({ queryKey: ['myDocuments'] });
      router.push('/dashboard');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

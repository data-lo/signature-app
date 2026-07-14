'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { requestCancellationRequest } from '../_requests';

function getErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  return (
    axiosError.response?.data?.message ??
    'Ocurrió un error al solicitar la cancelación. Intenta de nuevo.'
  );
}

export function useRequestCancellation(documentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => requestCancellationRequest(documentId),
    onSuccess: () => {
      toast.success('Solicitud de cancelación enviada correctamente');
      queryClient.invalidateQueries({
        queryKey: ['documentDetail', documentId],
      });
      queryClient.invalidateQueries({ queryKey: ['myDocuments'] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

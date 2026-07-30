'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/error-handler';
import { requestCancellationRequest } from '../_requests';

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
      toast.error(
        getErrorMessage(
          error,
          'Ocurrió un error al solicitar la cancelación. Intenta de nuevo.',
        ),
      );
    },
  });
}

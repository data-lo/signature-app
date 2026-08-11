'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/error-handler';
import { confirmCancellationRequest } from '../_requests';

export function useConfirmCancellation(documentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => confirmCancellationRequest(documentId),
    onSuccess: () => {
      toast.success('Documento cancelado correctamente');
      queryClient.invalidateQueries({
        queryKey: ['documentDetail', documentId],
      });
      // Confirmar la cancelación cambia el bucket del documento (signed_documents →
      // cancelled_documents), así que la URL prefirmada cacheada apunta a un bucket que ya no
      // corresponde — ver el mismo razonamiento en useSignDocument.
      queryClient.invalidateQueries({
        queryKey: ['documentFileUrl', documentId],
      });
      queryClient.invalidateQueries({ queryKey: ['myDocuments'] });
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(
          error,
          'Ocurrió un error al confirmar la cancelación. Intenta de nuevo.',
        ),
      );
    },
  });
}

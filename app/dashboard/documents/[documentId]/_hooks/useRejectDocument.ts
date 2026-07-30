'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/error-handler';
import { rejectDocumentRequest } from '../_requests';

export function useRejectDocument(documentId: string) {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reason: string) => rejectDocumentRequest(documentId, reason),
    onSuccess: () => {
      toast.success('Documento rechazado correctamente');
      queryClient.invalidateQueries({
        queryKey: ['documentDetail', documentId],
      });
      queryClient.invalidateQueries({ queryKey: ['myDocuments'] });
      router.push('/dashboard/documents');
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(
          error,
          'Ocurrió un error al rechazar el documento. Intenta de nuevo.',
        ),
      );
    },
  });
}

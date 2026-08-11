'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/error-handler';
import { rejectDocumentRequest } from '../_requests';
import { DOCUMENTS_SECTIONS } from '../../_config/sections';

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
      // Rechazar cambia el bucket del documento (created_documents → rejected_documents), así
      // que la URL prefirmada cacheada apunta a un bucket que ya no corresponde — ver el mismo
      // razonamiento en useSignDocument.
      queryClient.invalidateQueries({
        queryKey: ['documentFileUrl', documentId],
      });
      queryClient.invalidateQueries({ queryKey: ['myDocuments'] });
      router.push(DOCUMENTS_SECTIONS['to-sign'].href);
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

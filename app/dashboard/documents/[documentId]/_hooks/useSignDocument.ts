'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/error-handler';
import {
  signDocumentRequest,
  type SignDocumentPayload,
} from '../_requests';
import { DOCUMENTS_SECTIONS } from '../../_config/sections';

export function useSignDocument(documentId: string) {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload?: SignDocumentPayload) =>
      signDocumentRequest(documentId, payload),
    onSuccess: () => {
      toast.success('Documento firmado correctamente');
      queryClient.invalidateQueries({
        queryKey: ['documentDetail', documentId],
      });
      queryClient.invalidateQueries({ queryKey: ['myDocuments'] });
      router.push(DOCUMENTS_SECTIONS['to-sign'].href);
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(
          error,
          'Ocurrió un error al firmar el documento. Intenta de nuevo.',
        ),
      );
    },
  });
}

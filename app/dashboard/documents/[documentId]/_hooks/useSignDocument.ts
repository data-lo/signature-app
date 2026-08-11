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
      // Firmar mueve el documento de bucket en MinIO (created_documents →
      // signed_documents, ver STATUS_BUCKET_MAP en signature-server): la URL prefirmada que
      // devolvió GET /document/file/:id antes de firmar apunta al PDF SIN firmar. Sin invalidar
      // esta query, el `staleTime` global de 5 min (ver app/providers.tsx) la sigue sirviendo
      // desde cache y el visor muestra la versión original de un documento ya firmado.
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
          'Ocurrió un error al firmar el documento. Intenta de nuevo.',
        ),
      );
    },
  });
}

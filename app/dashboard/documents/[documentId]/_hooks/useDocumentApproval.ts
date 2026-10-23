'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { getErrorMessage } from '@/lib/error-handler';

import {
  approveDocumentRequest,
  rejectDocumentApprovalRequest,
} from '../_requests';

/**
 * Las dos decisiones del aprobador sobre un documento que requiere aprobación (historia
 * "Implementar flujo de aprobación previo al proceso de firma").
 *
 * Viven en un solo hook porque son la misma decisión con dos resultados: quien las usa las
 * muestra juntas, y lo que hay que invalidar tras cualquiera de las dos es idéntico. Separarlas
 * en dos archivos duplicaría esa lista de invalidaciones, que es justo donde se olvida una.
 *
 * **Qué se invalida y por qué.** `documentDetail` porque cambia el estado del documento y el del
 * propio aprobador; `documents` porque el listado muestra el estado y el documento acaba de
 * cambiar de recorte; y `documentFileUrl` **sólo al rechazar**, porque rechazar mueve el archivo
 * de bucket (`created_documents` → `rejected_documents`) y la URL prefirmada que había en caché
 * apunta a donde el archivo ya no está. Aprobar no lo mueve: el documento sigue en el mismo
 * bucket hasta que se firme.
 */
export function useDocumentApproval(documentId: string) {
  const queryClient = useQueryClient();

  function invalidateDocument({ fileMoved }: { fileMoved: boolean }) {
    queryClient.invalidateQueries({ queryKey: ['documentDetail', documentId] });
    queryClient.invalidateQueries({ queryKey: ['documents'] });
    if (fileMoved) {
      queryClient.invalidateQueries({
        queryKey: ['documentFileUrl', documentId],
      });
    }
  }

  const approveMutation = useMutation({
    mutationFn: () => approveDocumentRequest(documentId),
    onSuccess: () => {
      toast.success('Documento aprobado; ya se puede firmar');
      invalidateDocument({ fileMoved: false });
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(
          error,
          'Ocurrió un error al aprobar el documento. Intenta de nuevo.',
        ),
      );
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (resolutionNote?: string) =>
      rejectDocumentApprovalRequest(documentId, resolutionNote),
    onSuccess: () => {
      toast.success('Documento rechazado');
      invalidateDocument({ fileMoved: true });
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

  return {
    approveMutation,
    rejectMutation,
    /** Una decisión en curso bloquea la otra: son excluyentes y sólo una puede registrarse. */
    isDeciding: approveMutation.isPending || rejectMutation.isPending,
  };
}

'use client';

/**
 * SIN USO fuera de `PersonalDocumentsCompleted` y `PersonalDocumentsPartial`, que ya no monta
 * ninguna ruta (ver las notas en esos archivos).
 *
 * La baja de firma del flujo vigente es `identity/_hooks/useDeleteSignatureImage`: hace lo mismo
 * pero invalida también el estado de la credencial, porque borrar la firma devuelve al usuario a
 * SIGNATURE_PENDING y sin esa invalidación la pantalla seguiría marcando el paso 2 como
 * terminado.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/error-handler';
import { deleteIneFileRequest, deleteSignatureFileRequest } from '../_requests';

type DeletableField = 'ine' | 'signature';

interface DeletePersonalDocumentParams {
  signatureId: string;
  field: DeletableField;
}

function getDeleteFallbackMessage(field: DeletableField): string {
  return field === 'ine'
    ? 'Ocurrió un error al eliminar la identificación (INE). Intenta de nuevo.'
    : 'Ocurrió un error al eliminar la firma digital. Intenta de nuevo.';
}

export function useDeletePersonalDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ signatureId, field }: DeletePersonalDocumentParams) =>
      field === 'ine'
        ? deleteIneFileRequest(signatureId)
        : deleteSignatureFileRequest(signatureId),
    onSuccess: (_data, { field }) => {
      toast.success(
        field === 'ine'
          ? 'Identificación eliminada correctamente'
          : 'Firma eliminada correctamente',
      );
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
    onError: (error, { field }) => {
      toast.error(getErrorMessage(error, getDeleteFallbackMessage(field)));
    },
  });
}

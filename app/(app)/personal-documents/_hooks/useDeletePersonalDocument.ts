'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/error-handler';
import { deleteIneFileRequest, deleteSignatureFileRequest } from '../_requests';
import { getErrorMessage } from '@/lib/error-handler';

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

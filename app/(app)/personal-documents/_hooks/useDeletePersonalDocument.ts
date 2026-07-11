'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { deleteIneFileRequest, deleteSignatureFileRequest } from '../_requests';

type DeletableField = 'ine' | 'signature';

interface DeletePersonalDocumentParams {
  signatureId: string;
  field: DeletableField;
}

function getErrorMessage(error: unknown, field: DeletableField): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  const fallback =
    field === 'ine'
      ? 'Ocurrió un error al eliminar la identificación (INE). Intenta de nuevo.'
      : 'Ocurrió un error al eliminar la firma digital. Intenta de nuevo.';
  return axiosError.response?.data?.message ?? fallback;
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
      toast.error(getErrorMessage(error, field));
    },
  });
}

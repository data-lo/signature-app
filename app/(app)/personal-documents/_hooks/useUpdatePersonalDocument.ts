'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { updateIneFileRequest, updateSignatureFileRequest } from '../_requests';

type UpdatableField = 'ine' | 'signature';

interface UpdatePersonalDocumentParams {
  signatureId: string;
  field: UpdatableField;
  file: File;
}

function getErrorMessage(error: unknown, field: UpdatableField): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  const fallback =
    field === 'ine'
      ? 'Ocurrió un error al guardar la identificación (INE). Intenta de nuevo.'
      : 'Ocurrió un error al guardar la firma digital. Intenta de nuevo.';
  return axiosError.response?.data?.message ?? fallback;
}

export function useUpdatePersonalDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ signatureId, field, file }: UpdatePersonalDocumentParams) =>
      field === 'ine' ? updateIneFileRequest(signatureId, file) : updateSignatureFileRequest(signatureId, file),
    onSuccess: (_data, { field }) => {
      toast.success(
        field === 'ine' ? 'Identificación guardada correctamente' : 'Firma guardada correctamente',
      );
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
    onError: (error, { field }) => {
      toast.error(getErrorMessage(error, field));
    },
  });
}

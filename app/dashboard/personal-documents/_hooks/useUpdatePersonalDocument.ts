'use client';

/**
 * SIN USO fuera de `PersonalDocumentsPartial`, que ya no lo monta ninguna ruta (ver la nota en
 * ese archivo). Se conserva con él, y con él se elimina.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/error-handler';
import { updateIneFileRequest, updateSignatureFileRequest } from '../_requests';

type UpdatableField = 'ine' | 'signature';

interface UpdatePersonalDocumentParams {
  signatureId: string;
  field: UpdatableField;
  file: File;
}

function getUpdateFallbackMessage(field: UpdatableField): string {
  return field === 'ine'
    ? 'Ocurrió un error al guardar la identificación (INE). Intenta de nuevo.'
    : 'Ocurrió un error al guardar la firma digital. Intenta de nuevo.';
}

export function useUpdatePersonalDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ signatureId, field, file }: UpdatePersonalDocumentParams) =>
      field === 'ine'
        ? updateIneFileRequest(signatureId, file)
        : updateSignatureFileRequest(signatureId, file),
    onSuccess: (_data, { field }) => {
      toast.success(
        field === 'ine'
          ? 'Identificación guardada correctamente'
          : 'Firma guardada correctamente',
      );
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['onboardingProfile'] });
    },
    onError: (error, { field }) => {
      toast.error(getErrorMessage(error, getUpdateFallbackMessage(field)));
    },
  });
}

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/error-handler';
import { updateIneFileRequest, updateSignatureFileRequest } from '../_requests';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { getErrorMessage } from '@/lib/error-handler';

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
      if (field === 'signature') {
        useAuthStore.getState().updateOnboardingStatus('signature', true);
      }
    },
    onError: (error, { field }) => {
      toast.error(getErrorMessage(error, getUpdateFallbackMessage(field)));
    },
  });
}

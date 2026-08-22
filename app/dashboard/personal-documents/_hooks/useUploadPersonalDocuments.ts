'use client';

/**
 * SIN USO fuera de `PersonalDocumentsForm`, que a su vez ya no lo monta ninguna ruta (ver la
 * nota en ese archivo).
 *
 * El alta de firma del flujo vigente es `identity/_hooks/useUploadSignatureImage`, que llama al
 * mismo endpoint pero sin INE, invalida además el estado de la credencial y NO redirige: la
 * pantalla de identidad se queda mostrando el resultado. Este hook redirige a
 * /dashboard/documents/create, comportamiento del onboarding anterior.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/error-handler';
import { uploadPersonalDocumentsRequest } from '../_requests';
import { useAuthStore } from '@/lib/store/useAuthStore';

function getUploadErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError;
  if (axiosError.response?.status === 401) {
    return 'Tu sesión ha expirado. Inicia sesión de nuevo.';
  }
  return getErrorMessage(
    error,
    'Ocurrió un error al guardar tus documentos. Intenta de nuevo.',
  );
}

export function useUploadPersonalDocuments() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadPersonalDocumentsRequest,
    onSuccess: () => {
      toast.success('Tus documentos se guardaron correctamente');
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['onboardingProfile'] });
      useAuthStore.getState().updateOnboardingStatus('signature', true);
      if (!useAuthStore.getState().user?.isConfigured) {
        router.push('/dashboard/documents/create');
      }
    },
    onError: (error) => {
      toast.error(getUploadErrorMessage(error));
    },
  });
}

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { uploadPersonalDocumentsRequest } from '../_requests';
import { useAuthStore } from '@/lib/store/useAuthStore';

function getErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  if (axiosError.response?.status === 401) {
    return 'Tu sesión ha expirado. Inicia sesión de nuevo.';
  }
  return (
    axiosError.response?.data?.message ??
    'Ocurrió un error al guardar tus documentos. Intenta de nuevo.'
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
        router.push('/home');
      }
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

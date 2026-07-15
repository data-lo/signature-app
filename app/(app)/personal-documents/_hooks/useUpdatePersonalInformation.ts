'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { updatePersonalInformationRequest } from '../_requests';
import { useOnboardingStore } from '@/lib/store/useOnboardingStore';

function getErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  return (
    axiosError.response?.data?.message ??
    'Ocurrió un error al actualizar tu información de contacto. Intenta de nuevo.'
  );
}

export function useUpdatePersonalInformation() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePersonalInformationRequest,
    onSuccess: () => {
      toast.success('Información de contacto actualizada correctamente');
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['onboardingProfile'] });
      useOnboardingStore.getState().setPersonalConfigured(true);
      if (!useOnboardingStore.getState().isConfigured) {
        router.push('/home');
      }
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

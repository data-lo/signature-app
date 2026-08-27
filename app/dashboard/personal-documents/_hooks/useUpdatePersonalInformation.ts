'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/error-handler';
import { updatePersonalInformationRequest } from '../_requests';
import { useAuthStore } from '@/lib/store/useAuthStore';

export function useUpdatePersonalInformation() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePersonalInformationRequest,
    onSuccess: () => {
      toast.success('Información de contacto actualizada correctamente');
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['onboardingProfile'] });
      useAuthStore.getState().setPersonalConfigured(true);
      /**
       * Se vuelve siempre a la pantalla principal después de guardar. Antes esto dependía de
       * `isConfigured` —sólo redirigía la primera vez, mientras el onboarding seguía abierto—,
       * pero esa bandera dejó de existir como criterio y guardar los datos de contacto no tiene
       * por qué dejar al usuario parado en el formulario.
       */
      router.push('/dashboard/documents/create');
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(
          error,
          'Ocurrió un error al actualizar tu información de contacto. Intenta de nuevo.',
        ),
      );
    },
  });
}

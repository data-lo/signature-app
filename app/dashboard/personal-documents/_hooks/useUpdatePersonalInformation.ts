'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/error-handler';
import { updatePersonalInformationRequest } from '../_requests';
import { useAuthStore } from '@/lib/store/useAuthStore';

/**
 * Guarda los datos de contacto del perfil (teléfono y correo secundario).
 *
 * **No navega a ningún lado.** Hasta la historia "Evitar redirección a Documentos al guardar
 * información personal" mandaba siempre a `/dashboard/documents/create` al guardar, y el usuario
 * perdía la pantalla de perfil en la que estaba trabajando. Ahora se queda donde está: la
 * confirmación la da el toast, y el formulario muestra los valores nuevos en cuanto se recarga
 * `currentUser`.
 *
 * @returns La mutación de React Query; `mutate` recibe los valores del formulario.
 *
 * @example
 * ```ts
 * const updateMutation = useUpdatePersonalInformation();
 * updateMutation.mutate({ phoneNumber: '5512345678', secondaryEmail: '' });
 * ```
 */
export function useUpdatePersonalInformation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePersonalInformationRequest,
    onSuccess: () => {
      toast.success('Información de contacto actualizada correctamente');
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['onboardingProfile'] });
      useAuthStore.getState().setPersonalConfigured(true);
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

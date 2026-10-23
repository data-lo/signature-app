'use client';

import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/error-handler';
import { changePasswordRequest } from '../_requests';

/**
 * Cambio de contraseña del usuario autenticado.
 *
 * No invalida ninguna query ni navega a otro lado, a diferencia de `useUpdatePersonalInformation`:
 * la contraseña no forma parte del perfil que se muestra, así que no hay nada cacheado que
 * refrescar y quien la cambia se queda donde estaba.
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: changePasswordRequest,
    onSuccess: () => {
      toast.success('Contraseña actualizada correctamente');
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(
          error,
          'No se pudo actualizar tu contraseña. Intenta de nuevo.',
        ),
      );
    },
  });
}

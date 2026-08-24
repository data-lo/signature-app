'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/error-handler';
import { startDiditVerificationRequest } from '../_requests';
import { IDENTITY_VERIFICATION_QUERY_KEY } from './useIdentityVerification';

/**
 * Ruta a la que Didit devuelve al usuario al terminar. Es la misma pantalla: al volver, el
 * sondeo ya refleja el resultado del webhook sin que tenga que buscar dónde continuar.
 */
export const IDENTITY_RETURN_PATH = '/dashboard/personal-documents/identity';

export function useStartDiditVerification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => startDiditVerificationRequest(IDENTITY_RETURN_PATH),
    onSuccess: () => {
      /**
       * No se navega a Didit automáticamente: la pantalla pasa a mostrar el QR y los botones
       * para abrirla. Quien está en la computadora suele querer seguir en el celular, y un
       * redirect forzado le quitaría esa opción.
       */
      queryClient.invalidateQueries({
        queryKey: IDENTITY_VERIFICATION_QUERY_KEY,
      });
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(
          error,
          'No se pudo iniciar la verificación de identidad. Intenta de nuevo.',
        ),
      );
    },
  });
}

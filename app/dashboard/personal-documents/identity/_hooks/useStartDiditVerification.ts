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
       * No se navega a Didit automáticamente: la pantalla pasa a mostrar el código QR, que es el
       * camino previsto para continuar en el celular. Un redirect forzado dejaría la
       * verificación abierta en la computadora, que es justo donde el usuario no tiene cámara
       * para su INE ni para la selfie.
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

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/error-handler';
import { requestVerificationCodeRequest } from '../_requests';

export const UNDELIVERED_CODE_MESSAGE =
  'El código quedó generado, pero no pudimos enviarte el correo. Intenta reenviarlo o pide apoyo a quien te compartió el documento.';

/**
 * El código se emite aunque el correo no salga (ver `requestVerificationCodeRequest`): en ese
 * caso se avisa con un toast de advertencia en vez de uno de éxito, pero la mutación se resuelve
 * igual para que la pantalla muestre el campo del código y el botón de reenvío — antes esto era
 * un 500 que dejaba al firmante encerrado.
 */
export function useRequestVerificationCode(documentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => requestVerificationCodeRequest(documentId),
    onSuccess: (data) => {
      if (data.emailDelivered) {
        toast.success('Código de verificación enviado a tu correo');
      } else {
        toast(UNDELIVERED_CODE_MESSAGE, { icon: '⚠️' });
      }
      queryClient.invalidateQueries({
        queryKey: ['documentDetail', documentId],
      });
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(
          error,
          'Ocurrió un error al solicitar el código de verificación. Intenta de nuevo.',
        ),
      );
    },
  });
}

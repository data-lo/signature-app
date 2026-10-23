'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/error-handler';
import { deleteSignatureFileRequest } from '../../_requests';
import { IDENTITY_VERIFICATION_QUERY_KEY } from './useIdentityVerification';

/**
 * Baja de la firma PNG.
 *
 * Existe aparte de `useDeletePersonalDocument` porque acá también hay que invalidar el estado de
 * la credencial: borrar la firma devuelve al usuario a SIGNATURE_PENDING, y sin invalidar esa
 * consulta la pantalla seguiría mostrando el paso 2 como terminado.
 */
export function useDeleteSignatureImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (signatureId: string) =>
      deleteSignatureFileRequest(signatureId),
    onSuccess: () => {
      toast.success('Firma eliminada correctamente');
      queryClient.invalidateQueries({
        queryKey: IDENTITY_VERIFICATION_QUERY_KEY,
      });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['onboardingProfile'] });
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(
          error,
          'Ocurrió un error al eliminar tu firma. Intenta de nuevo.',
        ),
      );
    },
  });
}

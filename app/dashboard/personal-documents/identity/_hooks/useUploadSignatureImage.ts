'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/error-handler';
import { uploadPersonalDocumentsRequest } from '../../_requests';
import { IDENTITY_VERIFICATION_QUERY_KEY } from './useIdentityVerification';

/**
 * Alta de la firma PNG, paso 2 de la pantalla.
 *
 * Reutiliza el request de documentos personales (mismo endpoint `PUT /api/v1/users/me/signature`)
 * pero sin la INE: en este flujo la identificación la captura Didit, no el usuario. El backend
 * sólo acepta la firma con la credencial en SIGNATURE_PENDING, así que un 403 acá significa que
 * la identidad todavía no está aprobada.
 */
export function useUploadSignatureImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (signatureFile: File) =>
      uploadPersonalDocumentsRequest({ signatureFile }),
    onSuccess: () => {
      toast.success('Tu firma se guardó correctamente');
      queryClient.invalidateQueries({
        queryKey: IDENTITY_VERIFICATION_QUERY_KEY,
      });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['onboardingProfile'] });
      /**
       * No se marca nada en el store a mano: subir la rúbrica no es lo que habilita la firma
       * —eso lo decide `signingCredentialStatus`, que sólo mueve el backend—, y las
       * invalidaciones de arriba ya lo vuelven a traer.
       */
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(
          error,
          'Ocurrió un error al guardar tu firma. Intenta de nuevo.',
        ),
      );
    },
  });
}

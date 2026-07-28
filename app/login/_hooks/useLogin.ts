'use client';

import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import apiClient from '@/lib/axios';
import { getErrorMessage } from '@/lib/error-handler';
import { setAuthToken } from '@/lib/cookies';
import {
  getPendingSignatureContext,
  clearPendingSignatureContext,
} from '@/lib/pending-signature-context';
import { loginRequest } from '../_requests';
import type { LoginFormValues } from '../_schemas';

export function getLoginErrorMessage(error: unknown): string {
  return getErrorMessage(error, 'Error de conexión con el servidor');
}

export function useLogin() {
  return useMutation({
    mutationFn: (values: LoginFormValues) => loginRequest(values),
    onSuccess: async (data) => {
      setAuthToken(data.token);

      // Ver historia "Notificación por Email para Firma Simple y Vinculación de Cuenta": si el
      // usuario llegó desde /access-document y tuvo que iniciar sesión (Casos B/C — Registro
      // redirige a /login antes de vincular), se vincula su accountId al Collaborator pendiente
      // y se le manda directo al documento en vez de /home. Best-effort: si la vinculación
      // falla, igual se le manda al documento — sign() reintenta la vinculación por email al
      // firmar (Caso A), así que el usuario nunca queda atascado.
      const pendingContext = getPendingSignatureContext();
      if (pendingContext) {
        try {
          await apiClient.patch(
            `/document/${pendingContext.documentId}/link-collaborator`,
          );
        } catch (error) {
          console.error(
            '[login] no se pudo vincular la cuenta al documento pendiente:',
            error,
          );
        }
        clearPendingSignatureContext();
        window.location.href = `/documents/${pendingContext.documentId}`;
        return;
      }

      window.location.href = '/home';
    },
    onError: (error) => {
      console.error('[login] falló el inicio de sesión:', error);
      toast.error(getLoginErrorMessage(error));
    },
  });
}
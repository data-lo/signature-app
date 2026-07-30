'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';
import apiClient from '@/lib/axios';
import { getErrorMessage } from '@/lib/error-handler';
import { setAuthToken } from '@/lib/cookies';
import {
  getPendingSignatureContext,
  clearPendingSignatureContext,
} from '@/lib/pending-signature-context';
import { setPendingRegistrationContext } from '@/lib/pending-registration-context';
import { resendOtpRequest } from '@/app/signup/_requests';
import { loginRequest } from '../_requests';
import type { LoginFormValues } from '../_schemas';

export function useLogin() {
  const router = useRouter();

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
    onError: async (error, variables) => {
      console.error('[login] falló el inicio de sesión:', error);

      // Una pre-cuenta (isEmailVerified:false) responde 403 en vez de 401 (ver
      // AuthService.login) — en vez de un error genérico, se le reenvía un OTP y se le manda a
      // /signup/verify, igual que si acabara de registrarse (ver historia "Auth: Flujo de
      // Pre-registro, Verificación OTP y Control por CURP").
      if ((error as AxiosError).response?.status === 403) {
        try {
          const result = await resendOtpRequest(variables.email);
          setPendingRegistrationContext({
            email: result.email,
            maskedEmail: result.maskedEmail,
            isNewPreRegistration: false,
          });
          router.push('/signup/verify');
          return;
        } catch (resendError) {
          console.error(
            '[login] no se pudo reenviar el OTP tras el 403 de correo no verificado:',
            resendError,
          );
        }
      }

      toast.error(getErrorMessage(error, 'Error de conexión con el servidor'));
    },
  });
}
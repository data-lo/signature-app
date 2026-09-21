'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/error-handler';
import { setPendingRegistrationContext } from '@/lib/pending-registration-context';
import { acceptInvitationRequest } from '@/lib/api/organization-invitations';
import { registerRequest, type RegisterRequestValues } from '../_requests';

interface UseRegisterOptions {
  /**
   * Se invoca cuando el registro falla. Existe para que el formulario reinicie el CAPTCHA: el
   * token de Turnstile es de un solo uso, así que reintentar con el mismo lo rechazaría siempre
   * y el usuario quedaría atorado viendo el mismo error.
   */
  onError?: () => void;
}

/**
 * Crea la cuenta y, si el registro vino de una invitación, la acepta en cuanto el registro
 * responde bien.
 *
 * **La invitación se acepta DESPUÉS del registro y nunca dentro de él.** Así un problema con la
 * invitación —expirada, ya usada, revocada— no puede impedir que la cuenta se cree. Si aceptarla
 * falla, la cuenta se queda como está: se avisa y se sigue a la verificación OTP. El
 * administrador puede mandar una invitación nueva, y la persona la aceptará con el RFC que ya
 * registró.
 *
 * @param options.onError - Se llama si el REGISTRO falla (no la invitación), para reiniciar el
 *   CAPTCHA.
 * @returns La mutación de registro.
 *
 * @example
 * ```ts
 * const registerMutation = useRegister({ onError: resetTurnstile });
 * registerMutation.mutate({ ...values, invitationToken, turnstileToken });
 * ```
 */
export function useRegister({ onError }: UseRegisterOptions = {}) {
  const router = useRouter();
  return useMutation({
    mutationFn: (values: RegisterRequestValues) => registerRequest(values),
    onSuccess: async (data, values) => {
      if (values.invitationToken) {
        await acceptInvitationAfterRegister(values.invitationToken, values.rfc);
      }

      // El registro ya no deja la cuenta lista para usarse (ver historia "Auth: Flujo de
      // Pre-registro, Verificación OTP y Control por CURP") — siempre manda a verificar el OTP,
      // sea una pre-cuenta nueva o un CURP con un registro pendiente al que se le reenvió el
      // código (isNewPreRegistration:false).
      setPendingRegistrationContext({
        email: data.email,
        maskedEmail: data.maskedEmail,
        isNewPreRegistration: data.isNewPreRegistration,
      });
      router.push('/signup/verify');
    },
    onError: (error) => {
      console.error('[register] falló la creación de cuenta:', error);
      toast.error(
        getErrorMessage(
          error,
          'Ocurrió un error al crear tu cuenta. Intenta de nuevo.',
        ),
      );
      onError?.();
    },
  });
}

/**
 * Acepta la invitación con el RFC recién registrado, sin dejar que un fallo detenga el registro.
 *
 * No relanza: la cuenta ya existe y el siguiente paso —verificar el correo— tiene que ocurrir
 * igual. El mensaje le dice a la persona qué pasó y qué hacer, sin detalles técnicos.
 *
 * @param invitationToken - Token de la invitación que llegó en la URL del registro.
 * @param rfc - RFC con el que se acaba de crear la cuenta.
 * @returns Nada.
 *
 * @example
 * ```ts
 * await acceptInvitationAfterRegister(token, 'XAXX010101000');
 * ```
 */
async function acceptInvitationAfterRegister(
  invitationToken: string,
  rfc: string,
): Promise<void> {
  try {
    await acceptInvitationRequest(invitationToken, rfc);
  } catch (error) {
    console.error(
      '[register] la cuenta se creó, pero no se pudo aplicar la invitación:',
      error,
    );
    toast.error(
      'Tu cuenta se creó, pero no pudimos unirte a la organización. Pide al administrador que te envíe una nueva invitación.',
    );
  }
}

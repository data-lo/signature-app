'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/error-handler';
import { setPendingRegistrationContext } from '@/lib/pending-registration-context';
import { registerRequest, type RegisterRequestValues } from '../_requests';

export function useRegister() {
  const router = useRouter();
  return useMutation({
    mutationFn: (values: RegisterRequestValues) => registerRequest(values),
    onSuccess: (data) => {
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
    },
  });
}

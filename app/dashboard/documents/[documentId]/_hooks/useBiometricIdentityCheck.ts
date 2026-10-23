'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { hasVerifiedIdentity } from '@/lib/store/auth.slice';
import { getCurrentIdentityVerificationRequest } from '@/app/dashboard/personal-documents/identity/_requests';
import { IDENTITY_VERIFICATION_QUERY_KEY } from '@/app/dashboard/personal-documents/identity/_hooks/useIdentityVerification';

/**
 * Comprobación previa de la firma biométrica: ¿el firmante ya tiene su identidad verificada?
 *
 * Se consulta el estado en el momento del clic (`staleTime: 0`) y no el del store, que se llena
 * al iniciar sesión: quien acaba de validar su identidad en otra pestaña tiene que poder firmar
 * sin recargar. La respuesta queda además en el caché que usa "Identidad y firma".
 *
 * Si la consulta falla (red, 5xx) no se bloquea la firma: se deja seguir y el backend, que exige
 * la identidad al abrir la sesión de Didit, tiene la última palabra.
 *
 * @returns Una función asíncrona que resuelve `true` si la identidad está verificada (o no se pudo
 *   comprobar) y `false` si falta verificarla.
 *
 * @throws Nada: los errores de la consulta se tratan como "no se pudo comprobar".
 *
 * @example
 * ```ts
 * const checkIdentity = useBiometricIdentityCheck();
 * if (!(await checkIdentity())) setBiometricIdentityRequired(true);
 * ```
 */
export function useBiometricIdentityCheck(): () => Promise<boolean> {
  const queryClient = useQueryClient();

  return useCallback(async () => {
    try {
      const current = await queryClient.fetchQuery({
        queryKey: IDENTITY_VERIFICATION_QUERY_KEY,
        queryFn: getCurrentIdentityVerificationRequest,
        staleTime: 0,
      });
      return hasVerifiedIdentity(current.signingCredentialStatus);
    } catch {
      return true;
    }
  }, [queryClient]);
}

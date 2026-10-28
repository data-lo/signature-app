'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import PublicSigningLayout from '../PublicSigningLayout';
import { SigningSessionProvider } from '../SigningSessionProvider';
import { sessionSignatureFlows } from '../session-flows/registry';
import {
  fromCurrentSigningSession,
  type SigningSessionState,
} from '../signing-session';
import { getCurrentSigningSessionRequest } from './invitation-requests';

/**
 * La sesión pública de firma, ya con el correo validado: la MISMA para el correo y para el portal
 * del tercero. Consulta el contexto completo con la cookie de la sesión y monta el layout
 * compartido con los flujos de la sesión (`sessionSignatureFlows`), resueltos por tipo de firma.
 *
 * Sin sesión (venció, o se abrió `/sign/session` sin haber validado el código) muestra
 * `SESSION_EXPIRED`: hay que volver a abrir el enlace.
 *
 * @returns La pantalla de firma de la sesión.
 *
 * @example
 * ```tsx
 * <SigningSessionScreen />
 * ```
 */
export default function SigningSessionScreen() {
  const sessionQuery = useQuery({
    queryKey: ['currentSigningSession'],
    queryFn: getCurrentSigningSessionRequest,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const state = useMemo<SigningSessionState>(() => {
    if (sessionQuery.data) return fromCurrentSigningSession(sessionQuery.data);
    if (sessionQuery.isError) {
      const status = isAxiosError(sessionQuery.error)
        ? sessionQuery.error.response?.status
        : undefined;
      return { status: status === 401 ? 'SESSION_EXPIRED' : 'ERROR' };
    }
    return { status: 'LOADING' };
  }, [sessionQuery.data, sessionQuery.error, sessionQuery.isError]);

  const { refetch } = sessionQuery;
  const retry = useMemo(() => () => void refetch(), [refetch]);

  return (
    <SigningSessionProvider state={state} retry={retry}>
      <PublicSigningLayout registry={sessionSignatureFlows} />
    </SigningSessionProvider>
  );
}

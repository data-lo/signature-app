'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { SigningSessionProvider } from '@/app/(public)/_signing/SigningSessionProvider';
import PublicSigningLayout from '@/app/(public)/_signing/PublicSigningLayout';
import {
  fromSigningSessionResponse,
  type SigningSessionState,
} from '@/app/(public)/_signing/signing-session';
import { getSigningSessionByTokenRequest } from '../_requests';

interface InvitationSigningEntryProps {
  token: string;
}

/**
 * Adaptador de `/sign/:token` al modelo compartido: consulta la sesión del token y la entrega a
 * `PublicSigningLayout`, la misma pantalla que usa `/public/documents/:id/sign`.
 *
 * - Cargando → `LOADING`.
 * - 400/404 → `INVALID` (el backend no dice por qué; tampoco esta pantalla).
 * - Otro error → `ERROR`, con reintento.
 * - Respuesta → `fromSigningSessionResponse` (sesión activa, o sólo su estado).
 *
 * No pide inicio de sesión: el documento, el firmante y el tipo de firma los resuelve el backend
 * con el token, y la pantalla no manda nada más.
 *
 * @param props.token - Token de la ruta.
 * @returns La pantalla de firma de la invitación.
 *
 * @example
 * ```tsx
 * <InvitationSigningEntry token="q3Vb…" />
 * ```
 */
export default function InvitationSigningEntry({
  token,
}: InvitationSigningEntryProps) {
  const sessionQuery = useQuery({
    queryKey: ['signingSessionByToken', token],
    queryFn: () => getSigningSessionByTokenRequest(token),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const state = useMemo<SigningSessionState>(() => {
    if (sessionQuery.data) return fromSigningSessionResponse(sessionQuery.data);
    if (sessionQuery.isError) {
      const status = isAxiosError(sessionQuery.error)
        ? sessionQuery.error.response?.status
        : undefined;
      return { status: status === 400 || status === 404 ? 'INVALID' : 'ERROR' };
    }
    return { status: 'LOADING' };
  }, [sessionQuery.data, sessionQuery.error, sessionQuery.isError]);

  const { refetch } = sessionQuery;
  const retry = useMemo(() => () => void refetch(), [refetch]);

  return (
    <SigningSessionProvider state={state} retry={retry}>
      <PublicSigningLayout />
    </SigningSessionProvider>
  );
}

'use client';

import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/error-handler';
import {
  cancelSignatureCaptureSessionRequest,
  claimSignatureCaptureSessionRequest,
  createSignatureCaptureSessionRequest,
  getSignatureCaptureSessionRequest,
  saveHandwrittenSignatureRequest,
  SignatureCaptureChannel,
  SignatureCaptureSessionStatus,
  TERMINAL_CAPTURE_STATUSES,
  type SignatureCaptureSession,
} from '@/lib/api/signature-capture';

/**
 * Hooks de la captura de firma dibujada.
 *
 * Están en `lib/hooks/` porque los comparten dos rutas de secciones distintas: la pantalla de
 * identidad, donde el usuario dibuja o pide el QR, y `/signature-capture`, la pantalla que abre
 * el celular.
 */

export const SIGNATURE_CAPTURE_QUERY_KEY = ['signatureCaptureSession'];

/**
 * Cada cuánto pregunta la computadora si el celular ya confirmó.
 *
 * El resultado no llega por ninguna otra vía: quien guarda la firma es el teléfono, contra el
 * backend. Sin este sondeo el usuario firmaría en el celular y se quedaría mirando el QR hasta
 * recargar a mano.
 */
const CAPTURE_POLL_INTERVAL_MS = 3_000;

/** Claves que dependen del estado de la credencial y quedan obsoletas al guardar una firma. */
const CREDENTIAL_QUERY_KEYS = [
  ['identityVerification'],
  ['currentUser'],
  ['onboardingProfile'],
];

function invalidateCredential(queryClient: ReturnType<typeof useQueryClient>) {
  CREDENTIAL_QUERY_KEYS.forEach((queryKey) =>
    queryClient.invalidateQueries({ queryKey }),
  );
}

/** Sondea una captura abierta hasta que llega a un estado terminal. */
export function useSignatureCaptureSession(sessionId: string | null) {
  const queryClient = useQueryClient();
  /** La firma sólo se completa una vez por sesión: evita reinvalidar en cada sondeo posterior. */
  const notified = useRef<string | null>(null);

  const query = useQuery({
    queryKey: [...SIGNATURE_CAPTURE_QUERY_KEY, sessionId],
    queryFn: () => getSignatureCaptureSessionRequest(sessionId as string),
    enabled: Boolean(sessionId),
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      // En un estado terminal ya no puede cambiar solo: seguir preguntando sería tráfico inútil.
      if (!status || TERMINAL_CAPTURE_STATUSES.includes(status)) return false;
      return CAPTURE_POLL_INTERVAL_MS;
    },
    // El usuario vuelve a la pestaña de la computadora justo después de firmar en el celular.
    refetchOnWindowFocus: true,
  });

  /**
   * Cuando la firma llega desde el celular, quien la guardó fue el OTRO dispositivo: la
   * invalidación de `useSaveHandwrittenSignature` ocurrió allá, no aquí. Sin esto la computadora
   * se entera de que la captura terminó pero sigue mostrando el estado de credencial viejo —y no
   * lo vuelve a pedir, porque el sondeo de identidad se detiene en SIGNATURE_PENDING—, así que la
   * firma nueva no aparecería hasta recargar a mano.
   */
  useEffect(() => {
    const session = query.data;
    if (!session || session.status !== SignatureCaptureSessionStatus.Completed) {
      return;
    }
    if (notified.current === session.id) return;

    notified.current = session.id;
    invalidateCredential(queryClient);
  }, [query.data, queryClient]);

  return query;
}

export function useCreateSignatureCaptureSession() {
  return useMutation({
    mutationFn: (channel: SignatureCaptureChannel) =>
      createSignatureCaptureSessionRequest(channel),
    onError: (error) => {
      toast.error(
        getErrorMessage(
          error,
          'No se pudo iniciar la captura de firma. Intenta de nuevo.',
        ),
      );
    },
  });
}

/**
 * Canje del token del QR desde el celular.
 *
 * No muestra toast: la pantalla móvil dibuja el error a pantalla completa, porque un QR vencido o
 * ajeno no es un aviso pasajero sino el final del flujo en ese dispositivo.
 */
export function useClaimSignatureCaptureSession() {
  return useMutation({
    mutationFn: (token: string) => claimSignatureCaptureSessionRequest(token),
  });
}

export function useSaveHandwrittenSignature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, png }: { sessionId: string; png: Blob }) =>
      saveHandwrittenSignatureRequest(sessionId, png),
    onSuccess: (session: SignatureCaptureSession) => {
      /**
       * No se da por hecho que la credencial quedó configurada: quien lo decide es el backend, y
       * la respuesta ya trae el estado resultante. Se invalida para que la pantalla lo relea.
       */
      invalidateCredential(queryClient);
      queryClient.invalidateQueries({
        queryKey: [...SIGNATURE_CAPTURE_QUERY_KEY, session.id],
      });
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(
          error,
          'No se pudo guardar tu firma. Intenta de nuevo.',
        ),
      );
    },
  });
}

export function useCancelSignatureCaptureSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) =>
      cancelSignatureCaptureSessionRequest(sessionId),
    onSuccess: (session) => {
      queryClient.invalidateQueries({
        queryKey: [...SIGNATURE_CAPTURE_QUERY_KEY, session.id],
      });
    },
    /**
     * Cancelar es una cortesía para liberar la captura, no algo que el usuario esté esperando: si
     * falla, la sesión vence sola en diez minutos. Se registra y se sigue, sin molestarlo con un
     * error por una acción que ya dio por terminada.
     */
    onError: (error) => {
      console.error('[captura de firma] no se pudo cancelar la sesión:', error);
    },
  });
}

/** `true` cuando la captura terminó con la firma guardada. */
export function isCaptureCompleted(
  session: SignatureCaptureSession | undefined,
): boolean {
  return session?.status === SignatureCaptureSessionStatus.Completed;
}

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/error-handler';
import {
  biometricPollInterval,
  type BiometricGeolocation,
} from '@/lib/biometric-signature';
import {
  getGuestBiometricSessionRequest,
  getGuestSigningDocumentRequest,
  requestGuestAccessCodeRequest,
  startGuestBiometricSessionRequest,
  verifyGuestAccessCodeRequest,
  type GuestAccess,
  type GuestInvitation,
} from '../_requests';

/**
 * Indica si un error es el 401 de un acceso de invitado vencido o inválido.
 *
 * @param error - Error de la petición.
 * @returns `true` si hay que volver a pedir el código.
 *
 * @example
 * ```ts
 * if (isGuestAccessExpired(error)) clear();
 * ```
 */
export function isGuestAccessExpired(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 401;
}

/**
 * Pide el código de acceso al correo de la invitación.
 *
 * @param documentId - Documento.
 * @param invitation - Colaborador y correo del enlace.
 * @returns La mutación; `mutate()` envía el código.
 *
 * @example
 * ```ts
 * const request = useRequestGuestAccessCode('doc-1', invitation);
 * request.mutate();
 * ```
 */
export function useRequestGuestAccessCode(
  documentId: string,
  invitation: GuestInvitation,
) {
  return useMutation({
    mutationFn: () => requestGuestAccessCodeRequest(documentId, invitation),
    onError: (error) =>
      toast.error(
        getErrorMessage(
          error,
          'No se pudo enviar el código. Intenta de nuevo.',
        ),
      ),
  });
}

/**
 * Canjea el código por el acceso de invitado.
 *
 * @param documentId - Documento.
 * @param invitation - Colaborador y correo del enlace.
 * @param onVerified - Recibe el acceso para guardarlo.
 * @returns La mutación; `mutate(code)` canjea el código.
 *
 * @example
 * ```ts
 * const verify = useVerifyGuestAccessCode('doc-1', invitation, save);
 * verify.mutate('123456');
 * ```
 */
export function useVerifyGuestAccessCode(
  documentId: string,
  invitation: GuestInvitation,
  onVerified: (access: GuestAccess) => void,
) {
  return useMutation({
    mutationFn: (code: string) =>
      verifyGuestAccessCodeRequest(documentId, invitation, code),
    onSuccess: onVerified,
  });
}

/**
 * Documento que el invitado tiene que firmar. Sólo se consulta con un acceso vigente.
 *
 * @param documentId - Documento.
 * @param accessToken - Token de invitado, o `null` sin acceso.
 * @returns La consulta de React Query.
 *
 * @example
 * ```ts
 * const { data: document } = useGuestSigningDocument('doc-1', access?.accessToken ?? null);
 * ```
 */
export function useGuestSigningDocument(
  documentId: string,
  accessToken: string | null,
) {
  return useQuery({
    queryKey: ['guestSigningDocument', documentId, accessToken],
    queryFn: () => getGuestSigningDocumentRequest(documentId, accessToken!),
    enabled: Boolean(accessToken),
    retry: false,
  });
}

/**
 * Estado de la firma biométrica del invitado, sondeado mientras está en curso. Al cargar recupera
 * la sesión que hubiera dejado abierta: una recarga no abre otra.
 *
 * @param documentId - Documento.
 * @param accessToken - Token de invitado, o `null` sin acceso.
 * @returns La consulta; `data` es `null` si nunca inició una sesión.
 *
 * @example
 * ```ts
 * const { data: session } = useGuestBiometricSession('doc-1', token);
 * ```
 */
export function useGuestBiometricSession(
  documentId: string,
  accessToken: string | null,
) {
  return useQuery({
    queryKey: ['guestBiometricSession', documentId, accessToken],
    queryFn: () => getGuestBiometricSessionRequest(documentId, accessToken!),
    enabled: Boolean(accessToken),
    refetchInterval: (query) => biometricPollInterval(query.state.data),
    refetchOnWindowFocus: true,
    staleTime: 0,
    retry: false,
  });
}

/**
 * Inicia (o retoma) la sesión de Didit del invitado y deja la respuesta en el caché del estado,
 * para mostrar el QR en el acto.
 *
 * @param documentId - Documento.
 * @param accessToken - Token de invitado, o `null` sin acceso.
 * @returns La mutación; `mutate(geolocation)` abre la sesión.
 *
 * @example
 * ```ts
 * const start = useStartGuestBiometricSession('doc-1', token);
 * start.mutate({ latitude: 19.43, longitude: -99.13 });
 * ```
 */
export function useStartGuestBiometricSession(
  documentId: string,
  accessToken: string | null,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (geolocation: BiometricGeolocation) =>
      startGuestBiometricSessionRequest(documentId, accessToken!, geolocation),
    onSuccess: (session) => {
      queryClient.setQueryData(
        ['guestBiometricSession', documentId, accessToken],
        session,
      );
    },
    onError: (error) => {
      if (isGuestAccessExpired(error)) return;
      toast.error(
        getErrorMessage(
          error,
          'No se pudo iniciar la firma biométrica. Intenta de nuevo.',
        ),
      );
    },
  });
}

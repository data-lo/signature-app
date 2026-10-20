'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/error-handler';
import { isGuestAccessExpired } from '../../biometric-signature/_hooks/useGuestBiometricSignature';
import {
  getGuestAdvancedSigningDocumentRequest,
  requestGuestAdvancedAccessCodeRequest,
  signGuestAdvancedDocumentRequest,
  verifyGuestAdvancedAccessCodeRequest,
  type GuestAccess,
  type GuestAdvancedSignaturePayload,
  type GuestInvitation,
} from '../_requests';

/** Prefijo del acceso de Firma Avanzada en `sessionStorage` (ver `useGuestAccess`). */
export const ADVANCED_GUEST_ACCESS_PREFIX = 'advanced-guest-access';

/**
 * Pide el código de acceso al correo de la invitación.
 *
 * @param documentId - Documento.
 * @param invitation - Colaborador y correo del enlace.
 * @returns La mutación; `mutate()` envía el código.
 *
 * @example
 * ```ts
 * const request = useRequestGuestAdvancedAccessCode('doc-1', invitation);
 * request.mutate();
 * ```
 */
export function useRequestGuestAdvancedAccessCode(
  documentId: string,
  invitation: GuestInvitation,
) {
  return useMutation({
    mutationFn: () =>
      requestGuestAdvancedAccessCodeRequest(documentId, invitation),
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
 * Canjea el código por el acceso temporal de invitado.
 *
 * @param documentId - Documento.
 * @param invitation - Colaborador y correo del enlace.
 * @param onVerified - Recibe el acceso para guardarlo.
 * @returns La mutación; `mutate(code)` canjea el código.
 *
 * @example
 * ```ts
 * const verify = useVerifyGuestAdvancedAccessCode('doc-1', invitation, save);
 * verify.mutate('123456');
 * ```
 */
export function useVerifyGuestAdvancedAccessCode(
  documentId: string,
  invitation: GuestInvitation,
  onVerified: (access: GuestAccess) => void,
) {
  return useMutation({
    mutationFn: (code: string) =>
      verifyGuestAdvancedAccessCodeRequest(documentId, invitation, code),
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
 * const { data: document } = useGuestAdvancedSigningDocument('doc-1', token);
 * ```
 */
export function useGuestAdvancedSigningDocument(
  documentId: string,
  accessToken: string | null,
) {
  return useQuery({
    queryKey: ['guestAdvancedSigningDocument', documentId, accessToken],
    queryFn: () =>
      getGuestAdvancedSigningDocumentRequest(documentId, accessToken!),
    enabled: Boolean(accessToken),
    retry: false,
  });
}

/**
 * Firma con e.firma como invitado.
 *
 * Un 401 no se anuncia con un toast: la pantalla vuelve a pedir el código con su propio aviso.
 *
 * @param documentId - Documento.
 * @param accessToken - Token de invitado, o `null` sin acceso.
 * @returns La mutación; `mutate(payload)` firma.
 *
 * @example
 * ```ts
 * const sign = useSignGuestAdvancedDocument('doc-1', token);
 * sign.mutate({ keyFile, cerFile, password, geolocation, documentHash });
 * ```
 */
export function useSignGuestAdvancedDocument(
  documentId: string,
  accessToken: string | null,
) {
  return useMutation({
    mutationFn: (payload: GuestAdvancedSignaturePayload) =>
      signGuestAdvancedDocumentRequest(documentId, accessToken!, payload),
    onError: (error) => {
      if (isGuestAccessExpired(error)) return;
      toast.error(
        getErrorMessage(
          error,
          'No se pudo firmar el documento. Revisa tu e.firma e intenta de nuevo.',
        ),
      );
    },
  });
}

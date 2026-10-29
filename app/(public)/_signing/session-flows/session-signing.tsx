'use client';

import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { CheckCircle2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useGeolocation } from '@/lib/hooks/useGeolocation';
import { GEOLOCATION_ERROR_MESSAGES } from '@/lib/hooks/geolocation-error-messages';
import type { BiometricGeolocation } from '@/lib/biometric-signature';
import { getErrorMessage } from '@/lib/error-handler';
import {
  getCurrentSigningDocumentRequest,
  type SigningErrorBody,
  type SigningErrorCode,
} from '../invitation/invitation-requests';
import type { SigningResult } from '../signing-session';

/**
 * PDF de la sesión pública. Sólo se pide con sesión (código del correo validado), así que antes de
 * eso la pantalla nunca tiene la URL del documento.
 *
 * @returns La consulta de `GET /public/signing-sessions/current/document`.
 *
 * @example
 * ```ts
 * const documentQuery = useCurrentSigningDocument();
 * ```
 */
export function useCurrentSigningDocument() {
  return useQuery({
    queryKey: ['currentSigningDocument'],
    queryFn: getCurrentSigningDocumentRequest,
    retry: false,
    refetchOnWindowFocus: false,
    // La URL prefirmada vive minutos: se renueva antes de que venza.
    staleTime: 4 * 60 * 1000,
  });
}

/**
 * `Idempotency-Key` de un intento de firma: uno por pantalla montada. Un reintento (red, doble
 * clic) manda la misma y el backend devuelve la firma ya registrada en lugar de rechazarla.
 *
 * @returns La clave.
 *
 * @example
 * ```ts
 * const idempotencyKey = useSigningIdempotencyKey();
 * ```
 */
export function useSigningIdempotencyKey(): string {
  const key = useRef<string | null>(null);
  key.current ??= newIdempotencyKey();
  return key.current;
}

/**
 * Clave aleatoria para `Idempotency-Key`. `randomUUID` sólo existe en contextos seguros; fuera de
 * ellos se arma con `getRandomValues`, que sí está siempre.
 *
 * @returns 32 caracteres hexadecimales o un UUID.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * newIdempotencyKey(); // 'b1e4…'
 * ```
 */
export function newIdempotencyKey(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

/**
 * Ubicación del dispositivo para la firma, con el aviso cuando no se puede obtener.
 *
 * @returns `locate` (resuelve las coordenadas o `null` tras avisar) y si se está pidiendo.
 *
 * @example
 * ```ts
 * const { locate, locating } = useSigningLocation();
 * const coords = await locate();
 * ```
 */
export function useSigningLocation() {
  const { status, requestLocation } = useGeolocation();

  async function locate(): Promise<BiometricGeolocation | null> {
    const { coords, error } = await requestLocation();
    if (error || !coords) {
      const reason = error
        ? GEOLOCATION_ERROR_MESSAGES[error]
        : 'no se pudo determinar tu ubicación';
      toast.error(`No se puede firmar sin tu ubicación: ${reason}.`);
      return null;
    }
    return coords;
  }

  return { locate, locating: status === 'requesting' };
}

/**
 * Indica si un fallo de firma es inesperado (red o 5xx) y debe reportarse; los 4xx los explica el
 * propio mensaje del backend.
 *
 * @param error - Error de la petición.
 * @returns `true` si es inesperado.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * if (isUnexpectedSigningError(error)) onError({ cause: error });
 * ```
 */
export function isUnexpectedSigningError(error: unknown): boolean {
  const status = isAxiosError(error) ? error.response?.status : undefined;
  return status === undefined || status >= 500;
}

/** Mensaje controlado de cada código de la firma pública (ver `SigningErrorCode`). */
export const SIGNING_ERROR_MESSAGES: Readonly<
  Record<SigningErrorCode, string>
> = {
  EMAIL_VERIFICATION_REQUIRED:
    'Valida el código que enviamos a tu correo antes de firmar.',
  IDENTITY_VERIFICATION_REQUIRED:
    'Antes de firmar tienes que completar la verificación de tu identidad.',
  IDENTITY_VERIFICATION_REJECTED:
    'No pudimos verificar tu identidad. Contacta a quien te envió el documento.',
  IDENTITY_DATA_MISMATCH:
    'La identificación verificada no corresponde a la persona invitada a firmar este documento.',
  CERTIFICATE_INVALID:
    'Tu e.firma no es válida: revisa que el certificado esté vigente y que la llave y la contraseña correspondan.',
  CERTIFICATE_REVOKED:
    'El SAT reporta tu certificado como revocado. Tramita uno nuevo para firmar.',
  CERTIFICATE_SUBJECT_MISMATCH:
    'El titular de la e.firma no corresponde a la persona invitada a firmar este documento.',
  SIGNATURE_VALIDATION_FAILED:
    'La firma no corresponde al documento que revisaste. Vuelve a abrirlo y firma de nuevo.',
  SIGNING_SESSION_EXPIRED:
    'Tu sesión de firma venció. Vuelve a abrir tu invitación y valida el código.',
  SIGNING_NOT_AVAILABLE:
    'Este documento no tiene una firma pendiente para ti en este momento.',
};

/**
 * Código estable de un error de la sesión pública, si el backend lo mandó.
 *
 * @param error - Error de la petición.
 * @returns El código, o `null`.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * signingErrorCode(error); // 'CERTIFICATE_REVOKED'
 * ```
 */
export function signingErrorCode(error: unknown): SigningErrorCode | null {
  if (!isAxiosError<Partial<SigningErrorBody>>(error)) return null;
  const code = error.response?.data?.code;
  return code && Object.hasOwn(SIGNING_ERROR_MESSAGES, code) ? code : null;
}

/**
 * Mensaje para el firmante de un error de firma: el controlado de su código, o el del backend (o
 * el de respaldo) si no trae uno conocido.
 *
 * @param error - Error de la petición.
 * @param fallback - Mensaje si no hay nada mejor.
 * @returns El mensaje.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * toast.error(signingErrorMessage(error, 'No se pudo registrar la firma.'));
 * ```
 */
export function signingErrorMessage(error: unknown, fallback: string): string {
  const code = signingErrorCode(error);
  return code ? SIGNING_ERROR_MESSAGES[code] : getErrorMessage(error, fallback);
}

/** Espera con su texto. */
export function SigningPending({ text }: { text: string }) {
  return (
    <p
      role="status"
      className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"
    >
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {text}
    </p>
  );
}

/** El PDF no se pudo cargar: se ofrece reintentar. */
export function SigningDocumentError({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="mx-auto w-full max-w-md">
      <CardContent className="flex flex-col gap-3 pt-6">
        <p role="alert" className="text-sm text-destructive">
          No se pudo cargar el documento de tu invitación.
        </p>
        <Button type="button" variant="outline" onClick={onRetry}>
          Reintentar
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * Estado final tras firmar: confirmación e información básica del documento.
 *
 * @param props.documentName - Documento firmado.
 * @param props.result - Si con esta firma quedó completo.
 * @returns La tarjeta final.
 *
 * @example
 * ```tsx
 * <SigningCompleted documentName="contrato.pdf" result={{ documentCompleted: false }} />
 * ```
 */
export function SigningCompleted({
  documentName,
  result,
}: {
  documentName: string | null;
  result: SigningResult;
}) {
  return (
    <Card className="mx-auto w-full max-w-md">
      <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
        <CheckCircle2 className="size-10 text-emerald-600" aria-hidden />
        <p role="status" className="font-medium">
          Firma registrada
        </p>
        {documentName && <p className="break-words text-sm">{documentName}</p>}
        <p className="text-sm text-muted-foreground">
          {result.documentCompleted
            ? 'El documento quedó firmado por todos. Puedes cerrar esta página.'
            : 'Avisaremos a los demás firmantes. Puedes cerrar esta página.'}
        </p>
      </CardContent>
    </Card>
  );
}

/** El documento ya no espera la firma de este firmante en este momento. */
export function NothingToSign() {
  return (
    <Card className="mx-auto w-full max-w-md">
      <CardContent className="pt-6">
        <p role="status" className="text-sm text-muted-foreground">
          Este documento no tiene una firma pendiente para ti en este momento.
        </p>
      </CardContent>
    </Card>
  );
}

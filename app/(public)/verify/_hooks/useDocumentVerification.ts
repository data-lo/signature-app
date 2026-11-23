'use client';

import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import { verifyDocumentRequest } from '../_requests';

/** Por qué no se obtuvo un resultado de verificación. */
export type VerificationFailureKind =
  'FORMAT' | 'NOT_FOUND' | 'TOO_LARGE' | 'NETWORK' | 'UNKNOWN';

/** Fallo de la consulta, listo para mostrar. */
export interface VerificationFailure {
  kind: VerificationFailureKind;
  title: string;
  message: string;
}

const FAILURES: Record<
  VerificationFailureKind,
  Omit<VerificationFailure, 'kind'>
> = {
  FORMAT: {
    title: 'No pudimos leer el archivo',
    message:
      'El archivo no es un XML de auditoría ni un PDF final de Firmalo, o está dañado. Revisa que sea el archivo que descargaste y vuelve a intentarlo.',
  },
  NOT_FOUND: {
    title: 'No encontramos evidencia para este archivo',
    message:
      'No hay ningún documento firmado en Firmalo que corresponda a este archivo.',
  },
  TOO_LARGE: {
    title: 'El archivo es demasiado grande',
    message: 'El archivo supera el tamaño máximo permitido para la consulta.',
  },
  NETWORK: {
    title: 'No pudimos conectar con el servicio',
    message:
      'Revisa tu conexión a internet e inténtalo de nuevo. Tu archivo no se envió.',
  },
  UNKNOWN: {
    title: 'No pudimos verificar el archivo',
    message:
      'Ocurrió un error al procesar la consulta. Inténtalo de nuevo más tarde.',
  },
};

/**
 * Traduce el error de la petición a un fallo mostrable.
 *
 * El mensaje es siempre nuestro, nunca el cuerpo del backend: así un error interno no termina en
 * una pantalla pública, y el texto es el mismo para el mismo caso.
 *
 * @param error - Lo que lanzó `verifyDocumentRequest`.
 * @returns El tipo de fallo con su título y mensaje.
 *
 * @example
 * ```ts
 * toVerificationFailure(axiosErrorWithStatus(422)).kind; // 'FORMAT'
 * ```
 */
export function toVerificationFailure(error: unknown): VerificationFailure {
  const kind = classifyFailure(error);
  return { kind, ...FAILURES[kind] };
}

function classifyFailure(error: unknown): VerificationFailureKind {
  if (!isAxiosError(error)) return 'UNKNOWN';
  // Sin respuesta: la petición no llegó (sin red, CORS, servidor caído).
  if (!error.response) return 'NETWORK';

  switch (error.response.status) {
    case 400:
    case 415:
    case 422:
      return 'FORMAT';
    case 404:
      return 'NOT_FOUND';
    case 413:
      return 'TOO_LARGE';
    default:
      return 'UNKNOWN';
  }
}

/**
 * Consulta pública de verificación de un XML de auditoría o PDF final.
 *
 * Envía sólo el archivo (ver `verifyDocumentRequest`) y no registra nada de él: ni en consola ni
 * en la telemetría. El resultado vive en la mutación, así que la página no cambia de ruta.
 *
 * @returns `verify(file)` para consultar, el `result` de una respuesta exitosa, el `failure` de
 *   una fallida, `isPending` mientras se procesa y `reset()` para volver al estado inicial.
 *
 * @example
 * ```tsx
 * const { verify, result, failure, isPending } = useDocumentVerification();
 * <Button disabled={!file || isPending} onClick={() => verify(file)}>Verificar</Button>
 * ```
 */
export function useDocumentVerification() {
  const mutation = useMutation({
    mutationFn: verifyDocumentRequest,
    retry: false,
  });

  return {
    verify: (file: File) => mutation.mutate(file),
    result: mutation.data ?? null,
    failure: mutation.error ? toVerificationFailure(mutation.error) : null,
    isPending: mutation.isPending,
    reset: mutation.reset,
  };
}

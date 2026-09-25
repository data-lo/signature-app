import { AxiosError } from 'axios';
import { getErrorMessage } from '@/lib/error-handler';
import { DOCUMENT_FILE_MAX_SIZE_MB } from './_config/document-file.config';

export const UPLOAD_TOO_LARGE_MESSAGE = `El documento supera el tamaño máximo permitido (${DOCUMENT_FILE_MAX_SIZE_MB} MB). Reduce su tamaño e inténtalo de nuevo.`;
export const UPLOAD_CONNECTION_LOST_MESSAGE =
  'Se interrumpió la conexión mientras se enviaba el documento. Revisa tu conexión e inténtalo de nuevo.';
export const UPLOAD_TIMEOUT_MESSAGE =
  'El envío del documento tardó demasiado y no se completó. Inténtalo de nuevo; tu documento y la configuración se conservan.';

/** Estados con los que un proxy o balanceador responde cuando el backend no contestó a tiempo. */
const GATEWAY_STATUSES = new Set([502, 503, 504]);
/** Códigos con los que axios marca que la petición se cortó por tiempo. */
const TIMEOUT_CODES = new Set(['ECONNABORTED', 'ETIMEDOUT']);

/**
 * Traduce el fallo del envío de un documento a un mensaje que diga qué pasó y qué hacer.
 *
 * Antes cualquier fallo sin `message` del backend caía en el mismo "Ocurrió un error al enviar el
 * documento", y los fallos típicos de un archivo grande son justo los que no traen ese mensaje:
 * el proxy que corta el cuerpo o el tiempo, o la conexión que se cae a mitad de la subida. Aquí
 * se distinguen, en este orden:
 *
 * 1. **413** (el servidor rechazó el tamaño): mensaje propio con el límite de negocio. El del
 *    backend habla de su red de seguridad (25 MB), que no es el límite que el usuario conoce.
 * 2. **Tiempo agotado** (código de axios o 502/503/504 de un proxy).
 * 3. **Sin respuesta**: la conexión se interrumpió.
 * 4. Lo demás: el mensaje del backend (que ya viene en español, p. ej. un PDF dañado) o el
 *    `fallback`.
 *
 * Todos terminan invitando a reintentar: tras un fallo el archivo y la configuración siguen en
 * pantalla, y el mismo botón de envío es el reintento.
 *
 * @param error - Error de la mutación (normalmente un `AxiosError`).
 * @param fallback - Mensaje para los errores que no se reconocen y no traen mensaje del backend.
 * @returns El mensaje para mostrar al usuario.
 *
 * @example
 * ```ts
 * getUploadErrorMessage(error, CREATE_DOCUMENT_ERROR_MESSAGE);
 * // 'Se interrumpió la conexión mientras se enviaba el documento. ...'
 * ```
 */
export function getUploadErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof AxiosError)) {
    return getErrorMessage(error, fallback);
  }

  const status = error.response?.status;

  if (status === 413) return UPLOAD_TOO_LARGE_MESSAGE;
  if (
    (error.code && TIMEOUT_CODES.has(error.code)) ||
    (status !== undefined && GATEWAY_STATUSES.has(status))
  ) {
    return UPLOAD_TIMEOUT_MESSAGE;
  }
  if (!error.response) return UPLOAD_CONNECTION_LOST_MESSAGE;

  return getErrorMessage(error, fallback);
}

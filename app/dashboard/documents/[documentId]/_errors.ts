import { isAxiosError } from 'axios';

/**
 * Por qué no se pudo cargar un documento, en las categorías que cambian lo que la persona puede
 * hacer: pedir acceso, revisar el enlace o reintentar.
 *
 * Antes la pantalla decía "Intenta de nuevo más tarde" para todo, y además React Query
 * reintentaba tres veces un 403 antes de rendirse: quien no tenía permiso veía varios segundos
 * de "Cargando documento..." y después un mensaje que le prometía que esperar serviría.
 */
export type DocumentLoadErrorKind = 'forbidden' | 'not-found' | 'unavailable';

/**
 * Clasifica el error de `GET /document/:id` (o de su archivo) por su código de respuesta.
 *
 * @param error - Lo que rechazó la petición.
 * @returns `forbidden` para 403, `not-found` para 404 y `unavailable` para cualquier otra cosa
 *   (5xx, red caída, error desconocido), que es lo único que tiene sentido reintentar.
 *
 * @example
 * ```ts
 * toDocumentLoadErrorKind(axiosErrorWithStatus403); // 'forbidden'
 * ```
 */
export function toDocumentLoadErrorKind(error: unknown): DocumentLoadErrorKind {
  if (!isAxiosError(error)) return 'unavailable';

  const status = error.response?.status;
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not-found';
  return 'unavailable';
}

/** Cuántas veces se reintenta un fallo `unavailable`: el mismo número que React Query por omisión. */
const MAX_UNAVAILABLE_RETRIES = 3;

/**
 * Política de reintentos para las consultas del documento: nunca un 403 ni un 404, que no van a
 * cambiar por insistir; sí los fallos transitorios.
 *
 * @param failureCount - Intentos fallidos hasta ahora.
 * @param error - Error del último intento.
 * @returns Si React Query debe volver a intentarlo.
 *
 * @example
 * ```ts
 * useQuery({ queryKey, queryFn, retry: retryDocumentLoad });
 * ```
 */
export function retryDocumentLoad(
  failureCount: number,
  error: unknown,
): boolean {
  return (
    toDocumentLoadErrorKind(error) === 'unavailable' &&
    failureCount < MAX_UNAVAILABLE_RETRIES
  );
}

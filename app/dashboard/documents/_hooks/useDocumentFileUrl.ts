'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { getDocumentFileUrlRequest, type DocumentFileUrl } from '../_requests';

/**
 * Margen antes del vencimiento a partir del cual la URL deja de reutilizarse: un PDF que empieza
 * a descargarse con una URL a segundos de vencer puede quedarse a medias (pdf.js pide el archivo
 * por rangos), así que se renueva con 5 minutos de holgura.
 */
export const FILE_URL_RENEWAL_MARGIN_MS = 5 * 60 * 1000;

/**
 * Cuánto se conserva en memoria la URL de un visor que ya se cerró. Es la vigencia que firma hoy
 * el backend (24 h): pasado ese plazo la URL ya no sirve, y antes de eso `staleTime` decide si se
 * reutiliza o se renueva al volver a abrir el documento.
 */
const FILE_URL_GC_TIME_MS = 24 * 60 * 60 * 1000;

/** URL prefirmada del archivo junto con el instante (epoch ms) en que MinIO la deja de aceptar. */
export interface DocumentFileUrlEntry extends DocumentFileUrl {
  expiresAt: number;
}

/**
 * Milisegundos que una URL del archivo puede seguir reutilizándose antes de tener que renovarla.
 *
 * Es su vigencia restante menos el margen de seguridad de 5 minutos. Sin URL en caché, o con una
 * que ya entró en el margen, devuelve 0: hay que pedir una nueva.
 *
 * @param entry - La URL en caché con su vencimiento absoluto, o `undefined` si no hay.
 * @param now - Instante de referencia en epoch ms; por defecto, el actual.
 * @returns Los milisegundos de reutilización restantes (nunca negativos).
 *
 * @example
 * ```ts
 * getFileUrlFreshnessMs({ fileId: 'f', secureUrl: 'https://…', expiresIn: 86400, expiresAt });
 * // → expiresAt - Date.now() - 5 min
 * ```
 */
export function getFileUrlFreshnessMs(
  entry: DocumentFileUrlEntry | undefined,
  now: number = Date.now(),
): number {
  if (!entry) return 0;
  return Math.max(0, entry.expiresAt - FILE_URL_RENEWAL_MARGIN_MS - now);
}

/**
 * Cada cuánto debe renovarse sola la URL mientras el visor está abierto, o `false` si no debe.
 *
 * Programa la renovación para el momento en que la URL entra en el margen de 5 minutos. No
 * programa nada si todavía no hay URL, si la última renovación falló (reintentar cada segundo
 * contra un backend caído sólo lo empeora: el visor ofrece el reintento manual) o si el backend
 * firmó con una vigencia menor que el margen, que haría pedir una URL nueva sin pausa.
 *
 * @param entry - La URL en caché, o `undefined` si no hay.
 * @param hasFailed - Si la última petición de la URL terminó en error.
 * @returns Los milisegundos hasta la renovación (mínimo 1 s), o `false`.
 *
 * @example
 * ```ts
 * getFileUrlRenewalIntervalMs(entry, false); // → 86_100_000 con una URL recién firmada a 24 h
 * ```
 */
export function getFileUrlRenewalIntervalMs(
  entry: DocumentFileUrlEntry | undefined,
  hasFailed: boolean,
): number | false {
  if (!entry || hasFailed) return false;
  if (entry.expiresIn * 1000 <= FILE_URL_RENEWAL_MARGIN_MS) return false;
  return Math.max(1000, getFileUrlFreshnessMs(entry));
}

/**
 * URL prefirmada del PDF que muestra el visor del detalle, reutilizada mientras siga vigente.
 *
 * Cada llamada a `GET /document/file/:id` firma una URL distinta, y el navegador y pdf.js tratan
 * cada una como un recurso nuevo: pedirla al volver a montar la vista o al recuperar el foco hacía
 * que el PDF se descargara entero otra vez. Ahora la URL se guarda en el caché EN MEMORIA de React
 * Query (nunca en `localStorage` ni cookies) y se reutiliza hasta 5 minutos antes de que venza
 * según el `expiresIn` que manda el backend. En ese momento se renueva sola si el visor está
 * abierto (`refetchInterval`), al volver a la pestaña o al reabrir el documento.
 *
 * Se renueva antes de tiempo cuando:
 * - el llamador usa `refetch()` (el visor no pudo cargar el PDF: URL vencida, 403 de MinIO o red);
 * - una mutación invalida `['documentFileUrl', documentId]` (firmar, rechazar, aprobar, cancelar
 *   o confirmar la cancelación pueden mover el archivo a otro bucket).
 *
 * Lleva la cuenta activa en la llave y la espera, igual que `useDocumentDetail`: el backend
 * autoriza el archivo con la misma regla que el detalle, a partir del `X-Account-Id`, así que la
 * URL de una cuenta nunca se sirve a otra.
 *
 * @param documentId - Documento cuyo archivo se quiere mostrar.
 * @param options.enabled - Permite posponer la consulta; por defecto, habilitada.
 * @returns El resultado de React Query con la URL y su `expiresAt` en `data`.
 *
 * @example
 * ```ts
 * const { data, isStale, isFetching, refetch } = useDocumentFileUrl('doc-1');
 * <PdfPreview file={data.secureUrl} onRefreshFile={() => void refetch()} />
 * ```
 */
export function useDocumentFileUrl(
  documentId: string,
  options?: { enabled?: boolean },
) {
  const activeAccountId = useAuthStore((state) => state.activeAccount?.id);

  return useQuery({
    queryKey: ['documentFileUrl', documentId, activeAccountId],
    queryFn: async (): Promise<DocumentFileUrlEntry> => {
      // El reloj se toma ANTES de la petición: así el vencimiento calculado nunca queda por
      // detrás del que firmó el servidor, aunque la respuesta tarde.
      const requestedAt = Date.now();
      const fileUrl = await getDocumentFileUrlRequest(documentId);
      return { ...fileUrl, expiresAt: requestedAt + fileUrl.expiresIn * 1000 };
    },
    enabled: (options?.enabled ?? true) && Boolean(activeAccountId),
    staleTime: (query) => getFileUrlFreshnessMs(query.state.data),
    gcTime: FILE_URL_GC_TIME_MS,
    // Ambos respetan `staleTime`: sólo piden una URL nueva si la vigente ya entró en el margen.
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    // Con el visor abierto, renueva la URL justo al entrar en el margen de 5 minutos.
    refetchInterval: (query) =>
      getFileUrlRenewalIntervalMs(
        query.state.data,
        query.state.status === 'error',
      ),
    retry: false,
  });
}

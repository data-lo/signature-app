'use client';

import { useQuery } from '@tanstack/react-query';
import { getDocumentFileUrlRequest } from '../_requests';

/**
 * Bug corregido: la vista de firma (/documents/[documentId]) renderizaba el PDF con el
 * `secureUrl` embebido en el detalle del documento — una URL prefirmada de MinIO calculada una
 * sola vez en esa respuesta. Si esa URL falla al cargarse en el visor (vencida, o cualquier
 * fallo transitorio de MinIO/red), no había forma de pedir una nueva sin recargar toda la
 * página. GET /document/file/:id (el mismo endpoint que ya usa la descarga) genera una URL
 * fresca contra MinIO en cada llamada — `refetch()` la vuelve a pedir sin depender del detalle
 * del documento ni de un reload completo.
 */
export function useDocumentFileUrl(
  documentId: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ['documentFileUrl', documentId],
    queryFn: () => getDocumentFileUrlRequest(documentId),
    enabled: options?.enabled ?? true,
    retry: false,
  });
}

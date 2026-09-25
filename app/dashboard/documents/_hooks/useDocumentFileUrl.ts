'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { getDocumentFileUrlRequest } from '../_requests';

/**
 * Bug corregido: la vista de firma (/documents/[documentId]) renderizaba el PDF con el
 * `secureUrl` embebido en el detalle del documento — una URL prefirmada de MinIO calculada una
 * sola vez en esa respuesta. Si esa URL falla al cargarse en el visor (vencida, o cualquier
 * fallo transitorio de MinIO/red), no había forma de pedir una nueva sin recargar toda la
 * página. GET /document/file/:id (el mismo endpoint que ya usa la descarga) genera una URL
 * fresca contra MinIO en cada llamada — `refetch()` la vuelve a pedir sin depender del detalle
 * del documento ni de un reload completo.
 *
 * Lleva la cuenta activa en la llave y la espera, igual que `useDocumentDetail`: el backend
 * autoriza el archivo con la misma regla que el detalle, a partir del `X-Account-Id`.
 */
export function useDocumentFileUrl(
  documentId: string,
  options?: { enabled?: boolean },
) {
  const activeAccountId = useAuthStore((state) => state.activeAccount?.id);

  return useQuery({
    queryKey: ['documentFileUrl', documentId, activeAccountId],
    queryFn: () => getDocumentFileUrlRequest(documentId),
    enabled: (options?.enabled ?? true) && Boolean(activeAccountId),
    retry: false,
  });
}

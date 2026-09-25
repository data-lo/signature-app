'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { getDocumentDetailRequest } from '../_requests';
import { retryDocumentLoad } from '../_errors';

/**
 * Detalle de un documento, consultado desde la cuenta activa.
 *
 * La cuenta va en la llave por lo mismo que en `useDocuments`: el backend decide el acceso con
 * el `X-Account-Id` de la petición, así que la respuesta de una cuenta no sirve para otra, y
 * `useSwitchActiveAccount` sólo puede tirar del caché lo que lleve la cuenta en la llave. Sin
 * ella, quien cambiaba de cuenta con el documento abierto seguía viendo lo que respondió la
 * anterior. Por la misma razón espera a que la cuenta activa se hidrate: sin `X-Account-Id` el
 * backend responde 403 y la pantalla diría "sin permiso" a quien sí lo tiene.
 *
 * @param documentId - Documento a consultar.
 * @param options.enabled - Para quien sólo lo necesita en ciertos momentos (diálogos, migas).
 * @returns La consulta de React Query del detalle.
 *
 * @example
 * ```ts
 * const { data, isPending, error } = useDocumentDetail('doc-1');
 * ```
 */
export function useDocumentDetail(
  documentId: string,
  options?: { enabled?: boolean },
) {
  const activeAccountId = useAuthStore((state) => state.activeAccount?.id);

  return useQuery({
    queryKey: ['documentDetail', documentId, activeAccountId],
    queryFn: () => getDocumentDetailRequest(documentId),
    enabled: (options?.enabled ?? true) && Boolean(activeAccountId),
    retry: retryDocumentLoad,
  });
}

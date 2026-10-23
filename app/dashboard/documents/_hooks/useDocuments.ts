'use client';

import { useQuery, type QueryKey } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { getDocumentsRequest } from '../_requests';
import {
  DEFAULT_DOCUMENTS_FILTERS,
  type DocumentsFilters,
} from '../_config/filters';

/**
 * Llave del listado. Se exporta para que las pruebas y quien la necesite la armen igual.
 *
 * @param params.activeAccountId - Cuenta activa: separa el caché de cada cuenta.
 * @param params.filters - Filtros aplicados.
 * @param params.page - Página pedida.
 * @param params.limit - Tamaño de página.
 * @returns La llave de React Query.
 *
 * @example
 * ```ts
 * documentsQueryKey({ activeAccountId: 'acc-1', filters, page: 2, limit: 25 });
 * ```
 */
export function documentsQueryKey({
  activeAccountId,
  filters,
  page,
  limit,
}: {
  activeAccountId: string | undefined;
  filters: DocumentsFilters;
  page: number;
  limit: number | undefined;
}) {
  return ['documents', activeAccountId, filters, page, limit] as const;
}

/**
 * Dice si dos llaves del listado sólo difieren en la página.
 *
 * Es la condición para reutilizar la respuesta anterior mientras llega la nueva: misma cuenta,
 * mismos filtros y mismo tamaño. Si cambió cualquiera de esas tres, la respuesta anterior no dice
 * nada útil sobre la nueva consulta —y con otra cuenta sería mezclar documentos ajenos—.
 *
 * @param previous - Llave de la consulta anterior.
 * @param next - Llave de la consulta actual.
 * @returns `true` si sólo cambió la página.
 *
 * @example
 * ```ts
 * isPageOnlyChange(keyPage1, keyPage2); // true
 * ```
 */
export function isPageOnlyChange(previous: QueryKey, next: QueryKey): boolean {
  const [, previousAccount, previousFilters, , previousLimit] = previous;
  const [, nextAccount, nextFilters, , nextLimit] = next;
  return (
    previousAccount === nextAccount &&
    previousLimit === nextLimit &&
    JSON.stringify(previousFilters) === JSON.stringify(nextFilters)
  );
}

interface UseDocumentsParams {
  filters?: DocumentsFilters;
  page: number;
  limit?: number;
}

/**
 * La consulta del listado unificado. Es la única que pide documentos en toda la aplicación.
 *
 * Antes recibía un `type` ('to-sign' | 'sent' | 'completed') y de ahí sacaba el scope y el estado
 * que había que mandar; también resolvía el correo del usuario para pasarlo como
 * `participantEmail`. Las dos cosas se fueron: el recorte lo nombra `filters.view` y el correo lo
 * resuelve el servidor desde el token, así que este hook ya no decide nada — sólo consulta.
 */
export function useDocuments({
  filters = DEFAULT_DOCUMENTS_FILTERS,
  page,
  limit,
}: UseDocumentsParams) {
  const activeAccountId = useAuthStore((state) => state.activeAccount?.id);

  // GET /document se filtra en el backend por X-Account-Id (cuenta activa). La queryKey debe
  // incluir esa cuenta para que un cambio de cuenta invalide el caché en vez de reutilizar la
  // lista de la cuenta anterior.
  const queryKey = documentsQueryKey({ activeAccountId, filters, page, limit });

  return useQuery({
    queryKey,
    queryFn: () => getDocumentsRequest({ filters, page, limit }),
    /**
     * Al pasar de página se conserva la respuesta anterior como *placeholder* (`isPlaceholderData`),
     * sólo para que los controles sigan sabiendo cuántas páginas hay mientras llega la nueva. La
     * pantalla no pinta esas filas como definitivas: con `isPlaceholderData` muestra la carga.
     * Si cambió la cuenta, los filtros o el tamaño no hay placeholder (ver `isPageOnlyChange`).
     */
    placeholderData: (previousData, previousQuery) =>
      previousQuery && isPageOnlyChange(previousQuery.queryKey, queryKey)
        ? previousData
        : undefined,
    /**
     * Antes esto esperaba además al correo del usuario (`useCurrentUser`), porque sin él la
     * consulta no podía armarse. Ya no hace falta: lo único que el cliente necesita saber es
     * desde qué cuenta pregunta.
     *
     * Bug corregido que sigue vigente: disparar sin esperar a `activeAccount` —que se hidrata
     * desde el store persistido, ver AuthProvider— mandaba la petición sin X-Account-Id y el
     * backend respondía 400 en cada carga inicial del dashboard.
     */
    enabled: Boolean(activeAccountId),
  });
}

'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { getDocumentsRequest } from '../_requests';
import {
  DEFAULT_DOCUMENTS_FILTERS,
  type DocumentsFilters,
} from '../_config/filters';

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
  return useQuery({
    queryKey: ['documents', activeAccountId, filters, page, limit],
    queryFn: () => getDocumentsRequest({ filters, page, limit }),
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

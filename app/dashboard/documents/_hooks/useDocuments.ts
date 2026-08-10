'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { getDocumentsRequest } from '../_requests';
import {
  EMPTY_DOCUMENTS_FILTERS,
  type DocumentsFilters,
} from '../_components/DocumentsFilterPanel';
import {
  DOCUMENTS_LIST_CONFIG,
  type DocumentsListType,
} from '../_config/sections';

interface UseDocumentsParams {
  /** Sección del módulo (ver DOCUMENTS_LIST_CONFIG): define scope y status de la consulta. */
  type: DocumentsListType;
  page: number;
  limit?: number;
  filters?: DocumentsFilters;
}

export function useDocuments({
  type,
  page,
  limit,
  filters = EMPTY_DOCUMENTS_FILTERS,
}: UseDocumentsParams) {
  const activeAccountId = useAuthStore((state) => state.activeAccount?.id);
  // El email siempre es el del usuario en sesión: se resuelve aquí para que cada sección solo
  // tenga que declarar su `type` y no repita el mismo `useCurrentUser()` en cada vista.
  const { data: currentUser } = useCurrentUser();
  const email = currentUser?.email;
  const { scope, status } = DOCUMENTS_LIST_CONFIG[type];

  // GET /document se filtra en el backend por X-Account-Id/X-Organization-Id (cuenta activa).
  // La queryKey debe incluir esa cuenta para que un cambio de cuenta invalide el caché en
  // vez de reutilizar la lista de la cuenta anterior.
  return useQuery({
    queryKey: ['myDocuments', activeAccountId, type, email, page, limit, filters],
    queryFn: () =>
      getDocumentsRequest({
        participantEmail: scope === 'participant' ? email : undefined,
        email: scope === 'creator' ? email : undefined,
        status,
        page,
        limit,
        filters,
      }),
    // Bug corregido: esperar solo a `email` disparaba la petición antes de que activeAccount
    // terminara de hidratarse desde el store persistido (ver AuthProvider), llegando sin
    // X-Account-Id y recibiendo 400 del backend en cada carga inicial del dashboard.
    enabled: Boolean(email) && Boolean(activeAccountId),
  });
}

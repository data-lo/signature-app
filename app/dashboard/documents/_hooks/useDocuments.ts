'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { getDocumentsRequest } from '../_requests';
import {
  EMPTY_DOCUMENTS_FILTERS,
  type DocumentsFilters,
} from '../_components/DocumentsFilterPanel';
import type { DocumentStatus, ParticipantStatus } from '@/lib/enums/document';

interface UseDocumentsParams {
  /** 'participant': documentos donde el usuario colabora (Por firmar/Completados).
   * 'creator': documentos enviados por el usuario (Enviados para firma). */
  scope: 'participant' | 'creator';
  email: string | undefined;
  status?: DocumentStatus | ParticipantStatus.Pending | ParticipantStatus.Signed;
  page: number;
  limit?: number;
  filters?: DocumentsFilters;
}

export function useDocuments({
  scope,
  email,
  status,
  page,
  limit,
  filters = EMPTY_DOCUMENTS_FILTERS,
}: UseDocumentsParams) {
  const activeAccountId = useAuthStore((state) => state.activeAccount?.id);

  // GET /document se filtra en el backend por X-Account-Id/X-Organization-Id (cuenta activa).
  // La queryKey debe incluir esa cuenta para que un cambio de cuenta invalide el caché en
  // vez de reutilizar la lista de la cuenta anterior.
  return useQuery({
    queryKey: [
      'myDocuments',
      activeAccountId,
      scope,
      email,
      status,
      page,
      limit,
      filters,
    ],
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

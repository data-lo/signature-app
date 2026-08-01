'use client';

import { useQuery } from '@tanstack/react-query';
import { getMyDocumentsRequest } from '../_requests';
import {
  EMPTY_DOCUMENTS_FILTERS,
  type DocumentsFilters,
} from '../../_components/DocumentsFilterPanel';
import { useAuthStore } from '@/lib/store/useAuthStore';

export function useMyDocuments(
  email: string | undefined,
  page: number,
  filters: DocumentsFilters = EMPTY_DOCUMENTS_FILTERS,
) {
  const activeAccountId = useAuthStore((state) => state.activeAccount?.id);

  // GET /document se filtra en el backend por X-Account-Id/X-Organization-Id
  // (documentos de la cuenta activa). La queryKey debe incluir esa cuenta
  // para que un cambio de cuenta invalide el caché y dispare la petición de
  // nuevo en lugar de reutilizar la lista de la cuenta anterior.
  return useQuery({
    queryKey: ['myDocuments', activeAccountId, email, page, filters],
    queryFn: () =>
      getMyDocumentsRequest(email as string, page, undefined, filters),
    enabled: Boolean(email),
  });
}

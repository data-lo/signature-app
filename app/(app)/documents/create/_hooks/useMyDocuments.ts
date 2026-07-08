'use client';

import { useQuery } from '@tanstack/react-query';
import { getMyDocumentsRequest } from '../_requests';
import { EMPTY_DOCUMENTS_FILTERS, type DocumentsFilters } from '../../_components/DocumentsFilterPanel';

export function useMyDocuments(
  email: string | undefined,
  page: number,
  filters: DocumentsFilters = EMPTY_DOCUMENTS_FILTERS,
) {
  return useQuery({
    queryKey: ['myDocuments', email, page, filters],
    queryFn: () => getMyDocumentsRequest(email as string, page, undefined, filters),
    enabled: Boolean(email),
  });
}

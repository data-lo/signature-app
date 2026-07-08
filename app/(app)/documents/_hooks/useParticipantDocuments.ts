'use client';

import { useQuery } from '@tanstack/react-query';
import { getParticipantDocumentsRequest } from '../_requests';
import { EMPTY_DOCUMENTS_FILTERS, type DocumentsFilters } from '../_components/DocumentsFilterPanel';

export function useParticipantDocuments(
  email: string | undefined,
  status: 'pending' | 'signed',
  page: number,
  filters: DocumentsFilters = EMPTY_DOCUMENTS_FILTERS,
) {
  return useQuery({
    queryKey: ['myDocuments', 'participant', email, status, page, filters],
    queryFn: () => getParticipantDocumentsRequest(email as string, status, page, undefined, filters),
    enabled: Boolean(email),
  });
}

import apiClient from '@/lib/axios';
import type { DocumentListItem } from './_components/DocumentsTable';
import {
  EMPTY_DOCUMENTS_FILTERS,
  buildDocumentsFilterParams,
  type DocumentsFilters,
} from './_components/DocumentsFilterPanel';

export interface DocumentsMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface DocumentsResult {
  documents: DocumentListItem[];
  meta: DocumentsMeta;
}

export async function getParticipantDocumentsRequest(
  email: string,
  status: 'pending' | 'signed',
  page = 1,
  limit = 25,
  filters: DocumentsFilters = EMPTY_DOCUMENTS_FILTERS,
): Promise<DocumentsResult> {
  const { data } = await apiClient.get<{
    success: boolean;
    message: string;
    data: DocumentListItem[];
    meta: DocumentsMeta;
  }>('/document', {
    params: {
      participantEmail: email,
      status,
      page,
      limit,
      ...buildDocumentsFilterParams(filters),
    },
  });

  return { documents: data.data, meta: data.meta };
}

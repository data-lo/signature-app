import apiClient from '@/lib/axios';
import type { DocumentListItem } from '../_components/DocumentsTable';
import {
  EMPTY_DOCUMENTS_FILTERS,
  buildDocumentsFilterParams,
  type DocumentsFilters,
} from '../_components/DocumentsFilterPanel';

interface CreateDocumentResponseData {
  id: string;
}

export async function createDocumentRequest(
  file: File,
  signerIds: string[],
  spectatorIds: string[],
): Promise<CreateDocumentResponseData> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('signerIds', JSON.stringify(signerIds));
  if (spectatorIds.length > 0) {
    formData.append('spectatorIds', JSON.stringify(spectatorIds));
  }

  const { data } = await apiClient.post<{
    success: boolean;
    message: string;
    data: CreateDocumentResponseData;
  }>('/document', formData);

  return data.data;
}

export async function submitForAuthorizationRequest(
  documentId: string,
): Promise<void> {
  await apiClient.patch(`/document/${documentId}/submit-for-authorization`);
}

export interface MyDocumentsMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface MyDocumentsResult {
  documents: DocumentListItem[];
  meta: MyDocumentsMeta;
}

export async function getMyDocumentsRequest(
  email: string,
  page = 1,
  limit = 10,
  filters: DocumentsFilters = EMPTY_DOCUMENTS_FILTERS,
): Promise<MyDocumentsResult> {
  const { data } = await apiClient.get<{
    success: boolean;
    message: string;
    data: DocumentListItem[];
    meta: MyDocumentsMeta;
  }>('/document', {
    params: { email, page, limit, ...buildDocumentsFilterParams(filters) },
  });

  return { documents: data.data, meta: data.meta };
}

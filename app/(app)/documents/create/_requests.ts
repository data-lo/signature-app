import apiClient from '@/lib/axios';
import type { DocumentListItem } from '../_components/DocumentsTable';
import {
  EMPTY_DOCUMENTS_FILTERS,
  buildDocumentsFilterParams,
  type DocumentsFilters,
} from '../_components/DocumentsFilterPanel';
import type { BackendCollaboratorPayload } from './_schemas';

interface CreateDocumentSignaturesResponseData {
  id: string;
  status: string;
  collaboratorsCount: number;
  notificationsCount: number;
  verificationCodesCount: number;
}

export async function createDocumentSignaturesRequest(
  file: File,
  documentData: { fileName: string; requiresApproval: boolean },
  collaborators: BackendCollaboratorPayload[],
  requiresDifferentSignatures: 'SIMPLE' | 'FIEL' | 'MIX',
): Promise<CreateDocumentSignaturesResponseData> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('documentData', JSON.stringify(documentData));
  formData.append('collaborators', JSON.stringify(collaborators));
  formData.append('requiresDifferentSignatures', requiresDifferentSignatures);

  const { data } = await apiClient.post<{
    success: boolean;
    message: string;
    data: CreateDocumentSignaturesResponseData;
  }>('/api/v1/documents/signatures', formData);

  return data.data;
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

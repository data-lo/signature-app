import apiClient from '@/lib/axios';
import type { DocumentListItem } from '../_components/DocumentsTable';

export interface SelectableUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export async function getUsersRequest(): Promise<SelectableUser[]> {
  const { data } = await apiClient.get<{
    success: boolean;
    message: string;
    data: SelectableUser[];
  }>('/user');

  return data.data;
}

interface CreateDocumentResponseData {
  id: string;
}

export async function createDocumentRequest(
  file: File,
  signerId: string,
  onUploadProgress?: (percent: number) => void,
  signal?: AbortSignal,
): Promise<CreateDocumentResponseData> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('signerId', signerId);

  const { data } = await apiClient.post<{
    success: boolean;
    message: string;
    data: CreateDocumentResponseData;
  }>('/document', formData, {
    signal,
    onUploadProgress: (event) => {
      if (onUploadProgress && event.total) {
        onUploadProgress(event.loaded / event.total);
      }
    },
  });

  return data.data;
}

export async function deleteDocumentRequest(documentId: string): Promise<void> {
  await apiClient.delete(`/document/${documentId}`);
}

export async function submitForAuthorizationRequest(documentId: string): Promise<void> {
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

export async function getMyDocumentsRequest(email: string, page = 1, limit = 10): Promise<MyDocumentsResult> {
  const { data } = await apiClient.get<{
    success: boolean;
    message: string;
    data: DocumentListItem[];
    meta: MyDocumentsMeta;
  }>('/document', { params: { email, page, limit } });

  return { documents: data.data, meta: data.meta };
}

import apiClient from '@/lib/axios';
import type { DocumentListItem } from './_components/DocumentsTable';
import {
  EMPTY_DOCUMENTS_FILTERS,
  buildDocumentsFilterParams,
  type DocumentsFilters,
} from './_components/DocumentsFilterPanel';
import type { DocumentStatus, ParticipantStatus } from '@/lib/enums/document';

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

export interface DocumentFileUrl {
  fileId: string;
  secureUrl: string;
  expiresIn: number;
}

export async function getDocumentFileUrlRequest(
  documentId: string,
): Promise<DocumentFileUrl> {
  const { data } = await apiClient.get<DocumentFileUrl>(
    `/document/file/${documentId}`,
  );

  return data;
}

export interface GetDocumentsParams {
  /** Documentos donde el usuario participa como colaborador (Por firmar/Completados). */
  participantEmail?: string;
  /** Documentos creados/enviados por el usuario (Enviados para firma). */
  email?: string;
  status?: DocumentStatus | ParticipantStatus.Pending | ParticipantStatus.Signed;
  page?: number;
  limit?: number;
  filters?: DocumentsFilters;
}

/** Endpoint único de listado de documentos (`GET /document`), usado por las tres vistas
 * (Por firmar, Enviados para firma, Completados) variando solo los parámetros de filtrado. */
export async function getDocumentsRequest({
  participantEmail,
  email,
  status,
  page = 1,
  limit = 10,
  filters = EMPTY_DOCUMENTS_FILTERS,
}: GetDocumentsParams): Promise<DocumentsResult> {
  const { data } = await apiClient.get<{
    success: boolean;
    message: string;
    data: DocumentListItem[];
    meta: DocumentsMeta;
  }>('/document', {
    params: {
      participantEmail,
      email,
      status,
      page,
      limit,
      ...buildDocumentsFilterParams(filters),
    },
  });

  return { documents: data.data, meta: data.meta };
}

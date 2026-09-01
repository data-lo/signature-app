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

/**
 * URL prefirmada del PDF.
 *
 * Con `download`, el backend firma la URL pidiéndole a MinIO que responda el archivo con el
 * NOMBRE DEL DOCUMENTO en vez de con la clave del objeto, que es un UUID. Sin el parámetro
 * devuelve la URL de siempre, que es la que consume el visor: una cabecera de descarga haría que
 * el PDF se bajara en lugar de mostrarse dentro de la pantalla de detalle.
 *
 * El nombre lo pone el backend, no esta capa: es el que está guardado en el documento y viaja
 * firmado dentro de la URL.
 */
export async function getDocumentFileUrlRequest(
  documentId: string,
  { download = false }: { download?: boolean } = {},
): Promise<DocumentFileUrl> {
  const { data } = await apiClient.get<DocumentFileUrl>(
    `/document/file/${documentId}`,
    download ? { params: { download: 'true' } } : undefined,
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

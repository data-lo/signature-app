import apiClient from '@/lib/axios';
import type { DocumentListItem } from './_components/DocumentsTable';
import {
  DEFAULT_DOCUMENTS_FILTERS,
  buildDocumentsQueryParams,
  type DocumentsFilters,
} from './_config/filters';

/** Dónde está parada la lista dentro del total. Espejo de la respuesta del endpoint unificado. */
export interface DocumentsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface DocumentsResult {
  items: DocumentListItem[];
  pagination: DocumentsPagination;
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
    `/api/v1/document/file/${documentId}`,
    download ? { params: { download: 'true' } } : undefined,
  );

  return data;
}

/** Lo que devuelve archivar: el documento y desde cuándo quedó archivado para este usuario. */
export interface ArchivedDocument {
  documentId: string;
  archived: boolean;
  archivedAt: string;
}

/**
 * Archiva un documento completado para el USUARIO EN SESIÓN.
 *
 * No cambia el documento ni lo esconde de los demás participantes: el backend sólo guarda la
 * preferencia del par documento-usuario, y a partir de ahí el listado deja de devolverlo a quien
 * archivó. Es idempotente, así que reintentar tras un fallo de red no duplica nada.
 */
export async function archiveDocumentRequest(
  documentId: string,
): Promise<ArchivedDocument> {
  const { data } = await apiClient.post<{
    success: boolean;
    message: string;
    data: ArchivedDocument;
  }>(`/api/v1/document/${documentId}/archive`);

  return data.data;
}

export interface GetDocumentsParams {
  filters?: DocumentsFilters;
  page?: number;
  limit?: number;
}

/**
 * El ÚNICO listado de documentos (`GET /document`).
 *
 * Antes esta función servía a tres pantallas y cada una le pasaba su receta: "Por firmar" mandaba
 * el correo del usuario como `participantEmail` más `status=pending`, "Enviados para firma"
 * mandaba `email`, y "Completados" repetía la primera con otro estado. El servidor no sabía qué
 * significaba ninguna de las tres —obedecía la combinación— así que el criterio de cada sección
 * vivía en el cliente y ninguna podía combinarse con otra.
 *
 * Ahora se manda lo que el usuario quiere ver (`view`, `search`, filtros) y el recorte lo
 * resuelve el backend. El correo ya no viaja: lo resuelve el servidor a partir del token, que
 * además es la única forma de que nadie pueda pedir la bandeja ajena escribiendo otro correo.
 */
export async function getDocumentsRequest({
  filters = DEFAULT_DOCUMENTS_FILTERS,
  page = 1,
  limit = 25,
}: GetDocumentsParams): Promise<DocumentsResult> {
  const { data } = await apiClient.get<DocumentsResult>('/api/v1/document', {
    params: {
      ...buildDocumentsQueryParams(filters),
      page,
      limit,
    },
  });

  return data;
}

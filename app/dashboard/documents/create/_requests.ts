import apiClient from '@/lib/axios';
import type { CreateDocumentSignaturesRequest } from './_interfaces/create-document-signatures-request.interface';
import type {
  CreatedDocumentSignatures,
  CreateDocumentSignaturesResponse,
} from './_interfaces/create-document-signatures-response.interface';

/**
 * Envía el documento a firma en una sola llamada multipart.
 *
 * El archivo va como binario y el resto de la configuración como JSON serializado dentro de
 * campos de texto (así lo espera `DocumentSignaturesController`).
 *
 * Informa el avance de la subida con `onUploadProgress`: con documentos de varios MB la subida
 * tarda lo suficiente como para que un botón que sólo dice "Enviando…" parezca colgado.
 *
 * @param request - Archivo, configuración, colaboradores y, opcionalmente, el callback de avance.
 * @returns El documento creado con sus firmas.
 *
 * @throws {AxiosError} Si la petición falla: sin respuesta (conexión), por tiempo o con el error
 * del backend (ver `getUploadErrorMessage`).
 *
 * @example
 * ```ts
 * const created = await createDocumentSignaturesRequest({
 *   file, documentData, collaborators, requiresDifferentSignatures: 'SIMPLE',
 *   onUploadProgress: (percent) => setProgress(percent),
 * });
 * ```
 */
export async function createDocumentSignaturesRequest({
  file,
  documentData,
  collaborators,
  requiresDifferentSignatures,
  onUploadProgress,
}: CreateDocumentSignaturesRequest): Promise<CreatedDocumentSignatures> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('documentData', JSON.stringify(documentData));
  formData.append('collaborators', JSON.stringify(collaborators));
  formData.append('requiresDifferentSignatures', requiresDifferentSignatures);

  const { data } = await apiClient.post<CreateDocumentSignaturesResponse>(
    '/api/v1/documents/signatures',
    formData,
    {
      onUploadProgress: onUploadProgress
        ? ({ loaded, total }) => {
            // `total` falta cuando el navegador no conoce el tamaño del cuerpo: sin él no hay
            // porcentaje honesto y se deja el que se informó último.
            if (total) onUploadProgress(Math.min(100, Math.round((loaded / total) * 100)));
          }
        : undefined,
    },
  );

  return data.data;
}

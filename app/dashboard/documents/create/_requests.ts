import apiClient from '@/lib/axios';
import type { CreateDocumentSignaturesRequest } from './_interfaces/create-document-signatures-request.interface';
import type {
  CreatedDocumentSignatures,
  CreateDocumentSignaturesResponse,
} from './_interfaces/create-document-signatures-response.interface';

/**
 * Envío del documento a firma en una sola llamada multipart: el archivo va como binario y el
 * resto de la configuración como JSON serializado dentro de campos de texto (así lo espera
 * `DocumentSignaturesController`).
 */
export async function createDocumentSignaturesRequest({
  file,
  documentData,
  collaborators,
  requiresDifferentSignatures,
}: CreateDocumentSignaturesRequest): Promise<CreatedDocumentSignatures> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('documentData', JSON.stringify(documentData));
  formData.append('collaborators', JSON.stringify(collaborators));
  formData.append('requiresDifferentSignatures', requiresDifferentSignatures);

  const { data } = await apiClient.post<CreateDocumentSignaturesResponse>(
    '/api/v1/documents/signatures',
    formData,
  );

  return data.data;
}

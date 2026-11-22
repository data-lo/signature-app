import axios from 'axios';

import {
  documentVerificationResultSchema,
  type DocumentVerificationResult,
} from './_schemas';

/**
 * Cliente propio y no `@/lib/axios`: la consulta es pública y sólo debe viajar el archivo. El
 * cliente compartido agrega el JWT y las cabeceras de cuenta/organización si hay sesión, y aquí
 * no deben salir.
 *
 * Tampoco pasa por los interceptores de observabilidad: el cuerpo de esta petición es el archivo
 * del usuario (un XML con CURP e INE de los firmantes, o el PDF firmado) y nunca se registra.
 */
const publicClient = axios.create({ baseURL: '/api' });

/** Ruta del endpoint de verificación (signature-server). */
export const VERIFY_DOCUMENT_PATH = '/api/v1/document/public/verify';

/** Nombre del campo multipart que lleva el archivo. */
export const VERIFY_DOCUMENT_FILE_FIELD = 'file';

/**
 * Envía el archivo al backend para que lo identifique y valide su evidencia.
 *
 * @param file - XML de auditoría o PDF final, ya validado por `verificationFileSchema`.
 * @returns El resultado de la verificación.
 *
 * @throws {AxiosError} Si el backend responde con error (400/415/422 formato, 404 sin evidencia,
 *   413 demasiado grande, 5xx) o no hay conexión.
 * @throws {ZodError} Si la respuesta no tiene la forma esperada.
 *
 * @example
 * ```ts
 * const result = await verifyDocumentRequest(file);
 * result.status; // 'VALID'
 * ```
 */
export async function verifyDocumentRequest(
  file: File,
): Promise<DocumentVerificationResult> {
  const formData = new FormData();
  formData.append(VERIFY_DOCUMENT_FILE_FIELD, file);

  // Sin `Content-Type` explícito: el navegador lo pone con el `boundary` del multipart.
  const { data } = await publicClient.post<{ data: unknown }>(
    VERIFY_DOCUMENT_PATH,
    formData,
  );

  return documentVerificationResultSchema.parse(data.data);
}

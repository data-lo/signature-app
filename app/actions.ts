'use server';

// Acciones del servidor para interactuar con la API de firma de documentos.
// Todas las funciones se ejecutan en el servidor (Next.js Server Actions) y
// se comunican con el backend a través de Axios.

import axios, { AxiosError } from 'axios';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3000';

// Estructura genérica de respuesta de la API
interface ApiResponse<T> {
  success: number;
  message: string;
  data: T;
}

// Representa un documento asociado a un firmante
interface SignerDocument {
  id: string;
  fileName: string;
  fileType: string;
  status: string;
  signerId: string;
  signedAt: string | null;
  createdAt: string;
}

// Resultado de la validación de acceso a un documento
export interface ValidateAccessResult {
  valid: boolean;
  documentUrl?: string;
  documentStatus?: string;
  error?: string;
  statusCode?: number;
}

// Extrae el mensaje de error y el código HTTP de un error de Axios.
// Si no hay respuesta del servidor (error de red), retorna 503.
function extractAxiosError(error: unknown): { message: string; statusCode: number } {
  const axiosError = error as AxiosError<{ message?: string }>;
  if (axiosError.response) {
    return {
      message: axiosError.response.data?.message ?? 'Error al procesar la solicitud',
      statusCode: axiosError.response.status,
    };
  }
  return { message: 'Error de conexión con el servidor', statusCode: 503 };
}

// Valida que un firmante tenga acceso a un documento específico.
// Verifica: (1) que el documento exista, (2) que el firmante tenga asignado el documento,
// y (3) obtiene la URL pre-firmada del archivo para mostrarlo en el visor.
export async function validateAccess({
  apiKey,
  signerId,
  documentId,
}: {
  apiKey: string;
  signerId: string;
  documentId: string;
}): Promise<ValidateAccessResult> {
  const headers = { 'x-api-key': apiKey };

  try {
    // Verifica que el documento exista en el sistema
    await axios.get(`${API_BASE_URL}/document/${documentId}`, { headers });

    // Obtiene todos los documentos asignados al firmante y busca el solicitado
    const signerResponse = await axios.get<SignerDocument[]>(
      `${API_BASE_URL}/document/signer/${signerId}`,
      { headers },
    );
    const signerDocs = signerResponse.data ?? [];
    const matchingDoc = signerDocs.find((doc) => doc.id === documentId);

    if (!matchingDoc) {
      return {
        valid: false,
        error: 'No tienes permisos para acceder a este documento',
        statusCode: 403,
      };
    }

    // Obtiene la URL pre-firmada para acceder al archivo del documento
    const fileResponse = await axios.get<ApiResponse<string>>(
      `${API_BASE_URL}/document/file/${documentId}`,
      { headers },
    );
    const documentUrl = fileResponse.data?.data ?? String(fileResponse.data);

    return { valid: true, documentUrl, documentStatus: matchingDoc.status };
  } catch (error) {
    const { message, statusCode } = extractAxiosError(error);
    return { valid: false, error: message, statusCode };
  }
}

// Solicita la generación de un código de verificación de un solo uso.
// Se usa antes de que el firmante confirme una acción (firmar, rechazar o cancelar).
export async function generateVerificationCode({
  documentId,
  signerId,
  type,
}: {
  documentId: string;
  signerId: string;
  type: 'VERIFICATION' | 'REJECTION' | 'CANCELLATION';
}): Promise<void> {
  try {
    await axios.post(`${API_BASE_URL}/verification-code/generate`, {
      documentId,
      signerId,
      type,
    });
  } catch (error) {
    const { message } = extractAxiosError(error);
    throw new Error(message);
  }
}

// Obtiene la URL pre-firmada del archivo de un documento dado su ID.
// Útil para refrescar la URL cuando expira sin volver a validar el acceso completo.
export async function fetchDocumentUrl({
  apiKey,
  documentId,
}: {
  apiKey: string;
  documentId: string;
}): Promise<string> {
  const headers = { 'x-api-key': apiKey };
  try {
    const res = await axios.get<ApiResponse<string>>(
      `${API_BASE_URL}/document/file/${documentId}`,
      { headers },
    );
    return res.data?.data ?? String(res.data);
  } catch (error) {
    const { message } = extractAxiosError(error);
    throw new Error(message);
  }
}

// Valida el código de verificación ingresado por el firmante.
// Lanza errores específicos para código incorrecto (401) o expirado (404),
// permitiendo que el UI muestre mensajes diferenciados al usuario.
export async function validateCode({
  documentId,
  signerId,
  code,
  type,
}: {
  documentId: string;
  signerId: string;
  code: string;
  type: 'VERIFICATION' | 'REJECTION' | 'CANCELLATION';
}): Promise<void> {
  try {
    console.log('Validating code with params:', { documentId, signerId, code, type });
    await axios.post(`${API_BASE_URL}/verification-code/validate`, {
      documentId,
      signerId,
      code,
      type,
    });
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    if (axiosError.response?.status === 401) {
      throw new Error('Código incorrecto. Inténtalo de nuevo.');
    }
    if (axiosError.response?.status === 404) {
      throw new Error('Código expirado');
    }
    const { message } = extractAxiosError(error);
    throw new Error(message);
  }
}

// Envía la solicitud de cancelación de un documento.
// Cambia el estado del documento a "pendiente de cancelación" en el backend.
export async function submitForCancellation({
  apiKey,
  documentId,
}: {
  apiKey: string;
  documentId: string;
}): Promise<void> {
  const headers = { 'x-api-key': apiKey };
  try {
    await axios.patch(`${API_BASE_URL}/document/${documentId}/cancellation/submit`, {}, { headers });
  } catch (error) {
    const { message } = extractAxiosError(error);
    throw new Error(message);
  }
}

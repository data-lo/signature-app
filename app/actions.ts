'use server';

import axios, { AxiosError } from 'axios';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3000';

interface ApiResponse<T> {
  success: number;
  message: string;
  data: T;
}

interface SignerDocument {
  id: string;
  fileName: string;
  fileType: string;
  status: string;
  signerId: string;
  signedAt: string | null;
  createdAt: string;
}

export interface ValidateAccessResult {
  valid: boolean;
  documentUrl?: string;
  error?: string;
  statusCode?: number;
}

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

export async function validateAccess({
  apiKey,
  userId,
  documentId,
}: {
  apiKey: string;
  userId: string;
  documentId: string;
}): Promise<ValidateAccessResult> {
  const headers = { 'x-api-key': apiKey };

  try {
    // Verify the document exists
    await axios.get(`${API_BASE_URL}/document/${documentId}`, { headers });

    // Verify userId has access to this document via the signer endpoint
    const signerResponse = await axios.get<SignerDocument[]>(
      `${API_BASE_URL}/document/signer/${userId}`,
      { headers },
    );
    const signerDocs = signerResponse.data ?? [];
    const hasAccess = signerDocs.some((doc) => doc.id === documentId);

    if (!hasAccess) {
      return {
        valid: false,
        error: 'No tienes permisos para acceder a este documento',
        statusCode: 403,
      };
    }

    // Get the pre-signed document file URL
    const fileResponse = await axios.get<ApiResponse<string>>(
      `${API_BASE_URL}/document/file/${documentId}`,
      { headers },
    );
    const documentUrl = fileResponse.data?.data ?? String(fileResponse.data);

    return { valid: true, documentUrl };
  } catch (error) {
    const { message, statusCode } = extractAxiosError(error);
    return { valid: false, error: message, statusCode };
  }
}

export async function generateVerificationCode({
  documentId,
  signerId,
  type,
}: {
  documentId: string;
  signerId: string;
  type: 'VERIFICATION' | 'REJECTION';
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

export async function validateCode({
  documentId,
  signerId,
  code,
  type,
}: {
  documentId: string;
  signerId: string;
  code: string;
  type: 'VERIFICATION' | 'REJECTION';
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

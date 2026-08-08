import apiClient from '@/lib/axios';
import {
  DocumentStatus,
  ParticipantRole,
  ParticipantStatus,
  SignatureType,
} from '@/lib/enums/document';

export interface DocumentParticipant {
  id: string;
  /** null cuando el colaborador fue invitado solo por email (sin cuenta de plataforma). */
  userId: string | null;
  email: string;
  name: string;
  role: ParticipantRole;
  status: ParticipantStatus;
  cancellationReason: string | null;
}

export interface DocumentDetail {
  id: string;
  fileName: string;
  fileType: string;
  totalPages: number;
  status: DocumentStatus;
  creator: string;
  secureUrl: string;
  expiresIn: number;
  participants: DocumentParticipant[];
  myRole: ParticipantRole | null;
  myStatus: ParticipantStatus | null;
  mySignatureType: SignatureType | null;
  canSign: boolean;
  canReject: boolean;
  canRequestCancellation: boolean;
  canConfirmCancellation: boolean;
  requiresVerification: boolean;
  verificationConfirmed: boolean;
}

export async function getDocumentDetailRequest(
  documentId: string,
): Promise<DocumentDetail> {
  const { data } = await apiClient.get<{
    success: boolean;
    message: string;
    data: DocumentDetail;
  }>(`/document/${documentId}`);

  return data.data;
}

export interface AdvancedSignatureFiles {
  password: string;
  keyFile: File;
  cerFile: File;
}

export interface SignDocumentGeolocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export type SignDocumentPayload = AdvancedSignatureFiles | SignDocumentGeolocation;

function isAdvancedSignature(
  payload: SignDocumentPayload,
): payload is AdvancedSignatureFiles {
  return 'keyFile' in payload;
}

/**
 * Siempre manda multipart/form-data (aunque no haya archivos ni geolocalización): el backend usa
 * `FileFieldsInterceptor` en este endpoint para poder recibir `.key`/`.cer` cuando la firma es
 * electrónica avanzada (FIEL) — mandar el PATCH sin body/Content-Type rompía a multer
 * ("Boundary not found"). Para firma simple, `payload` es la geolocalización (o undefined) y no
 * hay archivos que adjuntar.
 */
export async function signDocumentRequest(
  documentId: string,
  payload?: SignDocumentPayload,
): Promise<void> {
  const formData = new FormData();
  if (payload && isAdvancedSignature(payload)) {
    formData.append('password', payload.password);
    formData.append('key', payload.keyFile);
    formData.append('cer', payload.cerFile);
  } else if (payload) {
    formData.append('geolocation', JSON.stringify(payload));
  }
  await apiClient.patch(`/document/${documentId}/sign`, formData);
}

export async function requestVerificationCodeRequest(
  documentId: string,
): Promise<void> {
  await apiClient.post(`/document/${documentId}/verification-codes`);
}

export async function verifyCodeRequest(
  documentId: string,
  code: string,
): Promise<void> {
  await apiClient.post(`/document/${documentId}/verification-codes/verify`, {
    code,
  });
}

export async function linkCollaboratorRequest(
  documentId: string,
): Promise<{ linked: boolean }> {
  const { data } = await apiClient.patch<{
    success: boolean;
    message: string;
    data: { linked: boolean };
  }>(`/document/${documentId}/link-collaborator`);

  return data.data;
}

export async function rejectDocumentRequest(
  documentId: string,
  reason: string,
): Promise<void> {
  await apiClient.patch(`/document/${documentId}/reject`, { reason });
}

export async function requestCancellationRequest(
  documentId: string,
): Promise<void> {
  await apiClient.patch(`/document/${documentId}/submit-for-cancellation`);
}

export async function confirmCancellationRequest(
  documentId: string,
): Promise<void> {
  await apiClient.patch(`/document/${documentId}/confirm-cancellation`);
}

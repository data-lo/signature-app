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
  }>(`/api/v1/document/${documentId}`);

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

/**
 * La geolocalización es obligatoria para firmar (la exige el backend con un 400), y lo es para
 * ambos tipos de firma — antes la firma FIEL no la mandaba en absoluto, porque el payload era
 * una unión excluyente entre "archivos de e.firma" y "ubicación". Ahora la ubicación va siempre
 * y los archivos solo cuando la firma es avanzada.
 */
export interface SignDocumentPayload {
  geolocation: SignDocumentGeolocation;
  advancedSignature?: AdvancedSignatureFiles;
}

/**
 * Siempre manda multipart/form-data: el backend usa `FileFieldsInterceptor` en este endpoint
 * para poder recibir `.key`/`.cer` cuando la firma es electrónica avanzada (FIEL) — mandar el
 * PATCH sin body/Content-Type rompía a multer ("Boundary not found").
 */
export async function signDocumentRequest(
  documentId: string,
  payload: SignDocumentPayload,
): Promise<void> {
  const formData = new FormData();
  formData.append('geolocation', JSON.stringify(payload.geolocation));

  if (payload.advancedSignature) {
    formData.append('password', payload.advancedSignature.password);
    formData.append('key', payload.advancedSignature.keyFile);
    formData.append('cer', payload.advancedSignature.cerFile);
  }
  await apiClient.patch(`/api/v1/document/${documentId}/sign`, formData);
}

/**
 * Emisión del código de verificación de firma. `emailDelivered` distingue "el código quedó
 * emitido y salió el correo" de "quedó emitido pero el correo no salió": el backend ya no
 * responde 500 cuando falla el proveedor de correo (dejaba al firmante sin poder firmar ni
 * rechazar, ver signature-server), así que la pantalla necesita ese dato para avisarlo.
 */
export interface RequestVerificationCodeResponseData {
  emailDelivered: boolean;
}

export async function requestVerificationCodeRequest(
  documentId: string,
): Promise<RequestVerificationCodeResponseData> {
  const { data } = await apiClient.post<{
    success: boolean;
    message: string;
    data: RequestVerificationCodeResponseData | null;
  }>(`/api/v1/document/${documentId}/verification-codes`);

  // Un backend anterior a este contrato responde `data: null`; si llegó hasta acá con 2xx, el
  // correo salió (antes un fallo de envío era un 500), así que se asume entregado.
  return { emailDelivered: data.data?.emailDelivered ?? true };
}

export async function verifyCodeRequest(
  documentId: string,
  code: string,
): Promise<void> {
  await apiClient.post(`/api/v1/document/${documentId}/verification-codes/verify`, {
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
  }>(`/api/v1/document/${documentId}/link-collaborator`);

  return data.data;
}

export async function rejectDocumentRequest(
  documentId: string,
  reason: string,
): Promise<void> {
  await apiClient.patch(`/api/v1/document/${documentId}/reject`, { reason });
}

export async function requestCancellationRequest(
  documentId: string,
): Promise<void> {
  await apiClient.patch(`/api/v1/document/${documentId}/submit-for-cancellation`);
}

export async function confirmCancellationRequest(
  documentId: string,
): Promise<void> {
  await apiClient.patch(`/api/v1/document/${documentId}/confirm-cancellation`);
}

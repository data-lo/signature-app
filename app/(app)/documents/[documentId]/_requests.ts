import apiClient from '@/lib/axios';
import type { DocumentListStatus } from '../_components/DocumentsTable';

export type ParticipantRole = 'signer' | 'reviewer' | 'watcher' | 'creator';
export type ParticipantStatus = 'pending' | 'signed' | 'rejected';

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
  status: DocumentListStatus;
  creator: string;
  secureUrl: string;
  expiresIn: number;
  participants: DocumentParticipant[];
  myRole: ParticipantRole | null;
  myStatus: ParticipantStatus | null;
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

export async function signDocumentRequest(documentId: string): Promise<void> {
  await apiClient.patch(`/document/${documentId}/sign`);
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

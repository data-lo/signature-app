import apiClient from '@/lib/axios';
import type { DocumentListStatus } from '../_components/DocumentsTable';

export type ParticipantRole = 'signer' | 'spectator' | 'creator';
export type ParticipantStatus = 'pending' | 'signed' | 'rejected';

export interface DocumentParticipant {
  userId: string;
  name: string;
  role: ParticipantRole;
  status: ParticipantStatus;
  rejectionReason: string | null;
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

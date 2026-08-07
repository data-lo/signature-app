import apiClient from '@/lib/axios';
import type { BackendCollaboratorPayload } from './_schemas';

interface CreateDocumentSignaturesResponseData {
  id: string;
  status: string;
  collaboratorsCount: number;
  notificationsCount: number;
  verificationCodesCount: number;
}

export async function createDocumentSignaturesRequest(
  file: File,
  documentData: {
    fileName: string;
    requiresApproval: boolean;
    isSequential: boolean;
  },
  collaborators: BackendCollaboratorPayload[],
  requiresDifferentSignatures: 'SIMPLE' | 'FIEL' | 'MIX',
): Promise<CreateDocumentSignaturesResponseData> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('documentData', JSON.stringify(documentData));
  formData.append('collaborators', JSON.stringify(collaborators));
  formData.append('requiresDifferentSignatures', requiresDifferentSignatures);

  const { data } = await apiClient.post<{
    success: boolean;
    message: string;
    data: CreateDocumentSignaturesResponseData;
  }>('/api/v1/documents/signatures', formData);

  return data.data;
}

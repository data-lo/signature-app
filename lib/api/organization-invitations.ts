import apiClient from '@/lib/axios';

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED';

export interface InvitationPreview {
  organizationId: string;
  organizationName: string;
  email: string;
  status: InvitationStatus;
}

export async function getInvitationPreviewRequest(
  token: string,
): Promise<InvitationPreview> {
  const { data } = await apiClient.get<{
    success: boolean;
    message: string;
    data: InvitationPreview;
  }>(`/api/v1/organizations/invitations/${token}`);

  return data.data;
}

export async function acceptInvitationRequest(
  token: string,
  rfc: string,
): Promise<void> {
  await apiClient.post(`/api/v1/organizations/invitations/${token}/accept`, {
    rfc,
  });
}

import apiClient from '@/lib/axios';

export interface OrganizationMemberRole {
  id: string;
  name: string;
}

export interface OrganizationMember {
  accountId: string;
  userId: string;
  email: string;
  rfc: string | null;
  role: OrganizationMemberRole | null;
  joinedAt: string | null;
}

export async function getOrganizationMembersRequest(
  organizationId: string,
): Promise<OrganizationMember[]> {
  const { data } = await apiClient.get<{
    success: boolean;
    message: string;
    data: OrganizationMember[];
  }>(`/api/v1/organizations/${organizationId}/members`);

  return data.data;
}

export async function updateMemberRoleRequest(
  accountId: string,
  roleId: string,
): Promise<void> {
  await apiClient.patch(`/api/v1/organizations/members/${accountId}/role`, {
    roleId,
  });
}

export async function removeMemberRequest(accountId: string): Promise<void> {
  await apiClient.delete(`/api/v1/organizations/members/${accountId}`);
}

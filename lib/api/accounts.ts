import apiClient from '@/lib/axios';

export type AccountType = 'PERSONAL' | 'ORGANIZATION';

export interface AccountData {
  id: string;
  name: string;
  type: AccountType;
  createdAt: string;
  organizationDetail?: { name: string } | null;
}

export interface CreateOrganizationValues {
  name: string;
  organizationName: string;
}

export async function getAccountsCatalogRequest(): Promise<AccountData[]> {
  const { data } = await apiClient.get<{
    success: boolean;
    message: string;
    data: AccountData[];
  }>('/api/v1/accounts/me');

  return data.data;
}

export async function createOrganizationRequest(
  values: CreateOrganizationValues,
): Promise<AccountData> {
  const { data } = await apiClient.post<{
    success: boolean;
    message: string;
    data: AccountData;
  }>('/api/v1/organizations', values);

  return data.data;
}

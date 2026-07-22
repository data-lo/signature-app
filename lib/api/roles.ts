import apiClient from '@/lib/axios';

export interface RoleData {
  id: string;
  name: string;
  isSystemRole: boolean;
}

export async function getSystemRolesRequest(): Promise<RoleData[]> {
  const { data } = await apiClient.get<{
    success: boolean;
    message: string;
    data: RoleData[];
  }>('/api/v1/roles');

  return data.data;
}

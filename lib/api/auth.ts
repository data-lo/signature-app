import apiClient from '@/lib/axios';

export interface CurrentUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string | null;
  roles: string[];
  nationalId: string;
  signature?: {
    id: string;
    secureUrl: string;
    expiresIn: number;
  } | null;
  officialFile?: {
    id: string;
    secureUrl: string;
    expiresIn: number;
  } | null;
}

export async function getCurrentUserRequest(): Promise<CurrentUser> {
  const { data } = await apiClient.get<{
    success: boolean;
    message: string;
    data: CurrentUser;
  }>('/auth/me');

  return data.data;
}

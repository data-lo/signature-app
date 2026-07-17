import apiClient from '@/lib/axios';
import type { LoginFormValues } from './_schemas';

interface LoginResponseData {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    position: string;
    roles: string[];
  };
  token: string;
}

export async function loginRequest(
  values: LoginFormValues,
): Promise<LoginResponseData> {
  const { data } = await apiClient.post<{
    success: boolean;
    message: string;
    data: LoginResponseData;
  }>('/auth/login', values);
  return data.data;
}

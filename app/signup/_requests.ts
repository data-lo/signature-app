import apiClient from '@/lib/axios';
import type { RegisterFormValues } from './_schemas';

interface RegisterResponseData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  roles: string[];
  nationalId: string;
}

export async function registerRequest(values: RegisterFormValues): Promise<RegisterResponseData> {
  const { data } = await apiClient.post<{ success: boolean; message: string; data: RegisterResponseData }>(
    '/auth/register',
    values,
  );
  return data.data;
}

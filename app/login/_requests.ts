import apiClient from '@/lib/axios';
import type { LoginFormValues } from './_schemas';

interface LoginResponseData {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    roles: string[];
  };
  token: string;
}

export async function loginRequest(
  values: LoginFormValues,
): Promise<LoginResponseData> {
  // axios ya rechaza cualquier status fuera de 2xx (ver validateStatus por
  // defecto), y el interceptor de axios.ts loguea ese caso centralizadamente
  // — aquí solo queda extraer el payload del caso 2xx.
  const { data } = await apiClient.post<{
    success: boolean;
    message: string;
    data: LoginResponseData;
  }>('/api/v1/auth/login', values);
  return data.data;
}

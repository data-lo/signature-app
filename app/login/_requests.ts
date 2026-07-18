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
  const { data } = await apiClient.post<{ // Validar la estructura de la respuesta aqui o en el interceptor en axios.ts
    success: boolean; // Tambien validar el estatus de la peticion antes de retornar la data
    message: string;
    data: LoginResponseData;
  }>('/auth/login', values);
  return data.data;
}

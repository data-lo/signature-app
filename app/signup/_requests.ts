import apiClient from '@/lib/axios';
import type { RegisterFormValues } from './_schemas';

interface RegisterResponseData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
  nationalId: string;
}

export interface RegisterRequestValues extends RegisterFormValues {
  /** Presente cuando el registro viene de /join (RFC nuevo) — une automáticamente al usuario recién creado a esa organización (ver signature-server AuthService.register). */
  invitationToken?: string;
}

export async function registerRequest(
  values: RegisterRequestValues,
): Promise<RegisterResponseData> {
  const { data } = await apiClient.post<{
    success: boolean;
    message: string;
    data: RegisterResponseData;
  }>('/auth/register', values);
  return data.data;
}

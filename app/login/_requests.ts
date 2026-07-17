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

  console.log('[loginRequest] Iniciando petición de autenticación', {
    email: values.email,
    hasPassword: !!values.password,
  });

  try {
    const { data } = await apiClient.post<{
      success: boolean;
      message: string;
      data: LoginResponseData;
    }>('/auth/login', values);

    console.log('[loginRequest] Respuesta exitosa del backend', {
      success: data.success,
      message: data.message,
      wrappedData: data.data,
    });

    if (data.data) {
      console.log('[loginRequest] Datos del usuario y token extraídos', {
        userId: data.data.user?.id,
        userEmail: data.data.user?.email,
        roles: data.data.user?.roles,
        tokenReceived: !!data.data.token,
      });
    } else {
      console.warn('[loginRequest] Ojo: La petición fue exitosa pero "data.data" viene vacío.');
    }

    return data.data;
  } catch (error) {
    console.error('[loginRequest] Error atrapado en la función de login', error);
    throw error;
  }
}
import apiClient from '@/lib/axios';
import axios from 'axios'; // 🟩 Importante importar axios para validar el tipo de error
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

export async function loginRequest(values: LoginFormValues): Promise<LoginResponseData> {
  try {
    const { data } = await apiClient.post<{ success: boolean; message: string; data: LoginResponseData }>(
      '/auth/login',
      values,
    );
    return data.data;
  } catch (error) {
    console.group('🚨 [Error en loginRequest]');
    
    if (axios.isAxiosError(error)) {

      console.log('Mensaje de error:', error.message);
      console.log('Código de estado del servidor:', error.response?.status);
      console.log('Respuesta exacta del Backend (NestJS):', error.response?.data);
      console.log('Configuración de la petición que falló:', error.config);
    } else {

      console.log('Error de código/JS:', error);
    }
    
    console.groupEnd();

    throw error;
  }
}
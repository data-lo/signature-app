import apiClient from '@/lib/axios';
import type { RegisterFormValues } from './_schemas';

/**
 * Desde la historia "Auth: Flujo de Pre-registro, Verificación OTP y Control por CURP", el
 * registro ya no crea una cuenta lista para usarse: siempre deja al usuario pendiente de
 * verificar su correo (isNewPreRegistration distingue una pre-cuenta nueva de un CURP con un
 * registro pendiente al que solo se le reenvió el OTP — ver UserService.createFromSignup).
 */
export interface RegisterResponseData {
  userId: string;
  email: string;
  maskedEmail: string;
  isNewPreRegistration: boolean;
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

export interface VerifyOtpResponseData {
  user: { id: string; firstName: string; lastName: string; email: string };
  token: string;
}

export async function verifyOtpRequest(
  email: string,
  code: string,
): Promise<VerifyOtpResponseData> {
  const { data } = await apiClient.post<{
    success: boolean;
    message: string;
    data: VerifyOtpResponseData;
  }>('/auth/verify-otp', { email, code });
  return data.data;
}

export interface ResendOtpResponseData {
  email: string;
  maskedEmail: string;
}

export async function resendOtpRequest(
  email: string,
): Promise<ResendOtpResponseData> {
  const { data } = await apiClient.post<{
    success: boolean;
    message: string;
    data: ResendOtpResponseData;
  }>('/auth/resend-otp', { email });
  return data.data;
}

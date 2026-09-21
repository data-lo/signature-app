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
  /**
   * Token de un solo uso del widget de Cloudflare Turnstile. El backend lo canjea contra
   * Siteverify antes de crear el pre-registro; si falta o ya no sirve, responde 400 y no se crea
   * nada (ver signature-server TurnstileService).
   */
  turnstileToken: string;
  /**
   * Token de la invitación cuando el registro viene de `/join` (RFC sin cuenta). NO viaja al
   * backend: el registro sólo crea la cuenta. Se conserva en las variables de la mutación para
   * que `useRegister` acepte la invitación en cuanto el registro responda bien.
   */
  invitationToken?: string;
}

/**
 * Crea la cuenta por el flujo normal de registro.
 *
 * El `invitationToken` se separa antes de enviar: el backend ya no une a nadie a una
 * organización durante el registro, y mandarlo sólo daría la impresión de que lo hace.
 *
 * @param values - Datos del formulario, token del CAPTCHA y, opcionalmente, el de la invitación.
 * @returns Los datos para continuar a la verificación OTP.
 * @throws {AxiosError} Si el backend rechaza el registro.
 *
 * @example
 * ```ts
 * const data = await registerRequest({ ...values, turnstileToken });
 * ```
 */
export async function registerRequest(
  values: RegisterRequestValues,
): Promise<RegisterResponseData> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { invitationToken, ...body } = values;

  const { data } = await apiClient.post<{
    success: boolean;
    message: string;
    data: RegisterResponseData;
  }>('/api/v1/auth/register', body);
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
  }>('/api/v1/auth/verify-otp', { email, code });
  return data.data;
}

/**
 * Corrección de un registro que todavía no verifica su correo (ver historia "Permitir corregir
 * datos antes de verificar el correo"). Se autoriza con la contraseña elegida al registrarse,
 * no con el OTP: cuando el error está justamente en el correo, el código nunca llegó.
 *
 * Solo se mandan los campos a corregir; los ausentes se quedan como estaban.
 */
export interface UpdatePreRegistrationValues {
  /** Correo con el que se hizo el registro, aunque sea el que tiene el error. */
  currentEmail: string;
  password: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  nationalId?: string;
  rfc?: string;
}

export async function updatePreRegistrationRequest(
  values: UpdatePreRegistrationValues,
): Promise<RegisterResponseData> {
  const { data } = await apiClient.patch<{
    success: boolean;
    message: string;
    data: RegisterResponseData;
  }>('/api/v1/auth/pre-registration', values);
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
  }>('/api/v1/auth/resend-otp', { email });
  return data.data;
}

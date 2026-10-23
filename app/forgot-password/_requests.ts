import apiClient from '@/lib/axios';

/**
 * Siempre regresa el mismo mensaje genérico (anti-enumeración, ver
 * AuthService.forgotPassword) sin importar si el correo existe o no.
 */
export async function forgotPasswordRequest(email: string): Promise<void> {
  await apiClient.post('/api/v1/auth/forgot-password', { email });
}

export interface VerifyResetCodeResponseData {
  resetToken: string;
}

export async function verifyResetCodeRequest(
  email: string,
  code: string,
): Promise<VerifyResetCodeResponseData> {
  const { data } = await apiClient.post<{
    success: boolean;
    message: string;
    data: VerifyResetCodeResponseData;
  }>('/api/v1/auth/verify-reset-code', { email, code });
  return data.data;
}

export async function resetPasswordRequest(
  resetToken: string,
  newPassword: string,
  confirmPassword: string,
): Promise<void> {
  await apiClient.post('/api/v1/auth/reset-password', {
    resetToken,
    newPassword,
    confirmPassword,
  });
}

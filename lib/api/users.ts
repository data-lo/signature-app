import apiClient from '@/lib/axios';

/** Público (sin JWT) — usado desde /join y /signup para bifurcar el flujo de invitación a organización. */
export async function checkRfcRequest(rfc: string): Promise<boolean> {
  const { data } = await apiClient.get<{
    success: boolean;
    message: string;
    data: { exists: boolean };
  }>('/api/v1/users/check-rfc', { params: { rfc } });

  return data.data.exists;
}

import apiClient from '@/lib/axios';
import type { SubscriptionState } from './_interfaces/subscription-state.interface';

/**
 * La cuenta consultada NO viaja como parámetro: el interceptor de `apiClient` manda la cuenta
 * activa del store en `X-Account-Id`, igual que en el resto de la aplicación. Por eso quien
 * llame a esto tiene que incluir el id de la cuenta en su `queryKey` — si no, el caché serviría
 * la suscripción de la cuenta anterior después de cambiar de cuenta.
 */
export async function getSubscriptionStateRequest(): Promise<SubscriptionState> {
  const { data } = await apiClient.get<{
    success: boolean;
    message: string;
    data: SubscriptionState;
  }>('/api/v1/payments/subscription');

  return data.data;
}

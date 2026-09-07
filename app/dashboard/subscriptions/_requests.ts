import apiClient from '@/lib/axios';
import type {
  SubscriptionSchedule,
  SubscriptionState,
} from './_interfaces/subscription-state.interface';

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

/**
 * Programa la baja de la suscripción de la cuenta activa para el final del periodo.
 *
 * Sin cuerpo: qué suscripción se cancela lo determina por completo el `X-Account-Id` que manda el
 * interceptor, igual que el resto de este módulo. Mandar un id en el cuerpo dejaría dos fuentes
 * para lo mismo y la posibilidad de que discreparan.
 *
 * Responde 409 cuando no hay nada que cancelar o la baja ya estaba programada; el llamador lo
 * distingue por el status para poder refrescar en vez de tratarlo como un fallo.
 */
export async function cancelSubscriptionRequest(): Promise<SubscriptionSchedule> {
  const { data } = await apiClient.post<{
    success: boolean;
    message: string;
    data: SubscriptionSchedule;
  }>('/api/v1/payments/subscription/cancel');

  return data.data;
}

/**
 * Deshace una baja programada: la suscripción vuelve a renovarse.
 *
 * Sólo tiene sentido mientras el periodo siga vigente. Una vez que el perfil pasa a CANCELED el
 * backend responde 409 y el camino es contratar de nuevo, que para entonces la tarjeta ya ofrece.
 */
export async function resumeSubscriptionRequest(): Promise<SubscriptionSchedule> {
  const { data } = await apiClient.post<{
    success: boolean;
    message: string;
    data: SubscriptionSchedule;
  }>('/api/v1/payments/subscription/resume');

  return data.data;
}

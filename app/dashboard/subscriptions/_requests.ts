import apiClient from '@/lib/axios';
import type { SubscriptionSchedule } from './_interfaces/subscription-state.interface';

/**
 * Acá NO hay consulta de estado, y es a propósito: la lee `useBillingAccess`
 * (`GET /payments/billing-state`), que responde plan, saldo, beneficios y límites de la cuenta
 * activa en una sola petición. El endpoint que vivía acá —`GET /payments/subscription`— quedó
 * deprecado en el backend: describía el mismo perfil con menos campos y obligaba a decidir qué
 * habilitar a partir del nombre del plan.
 *
 * Lo que queda son las dos MUTACIONES de la suscripción, que siguen siendo suyas.
 */

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

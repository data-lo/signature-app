import apiClient from '@/lib/axios';

/**
 * Estado de facturación del propietario de la cuenta activa.
 *
 * Espejo de `BillingStateResponse` en signature-server, que lo lee de `billing_profiles`.
 * Sustituye a `SubscriptionState` (`GET /payments/subscription`), que salía de
 * `account_subscriptions` y describía "la primera cuenta activa del usuario" en vez de la
 * cuenta en la que está trabajando.
 */
export interface BillingState {
  /** `null` mientras la cuenta no haya intentado contratar nunca. */
  billingProfileId: string | null;
  /** Única pregunta que decide si el servicio está habilitado: el perfil está `ACTIVE`. */
  hasActiveSubscription: boolean;
  /**
   * Plan del catálogo (`basic`, `plus`, `premium`, ...). Es un conjunto abierto que define el
   * backend, no un enum del frontend: un plan nuevo no debe obligar a desplegar esta app.
   *
   * Sobrevive a la baja: un perfil cancelado conserva el último plan contratado, así que esto
   * NO sirve para saber si el servicio está habilitado — para eso está `hasActiveSubscription`.
   */
  currentPlanType: string | null;
}

/**
 * La cuenta consultada NO viaja como parámetro: el interceptor de `apiClient` manda la cuenta
 * activa del store en `X-Account-Id`, igual que en el resto de la aplicación. Por eso quien
 * llame a esto debe incluir el id de la cuenta en su `queryKey` — si no, el caché serviría el
 * estado de la cuenta anterior después de cambiar de cuenta.
 */
/**
 * El plan con el que nace toda cuenta, personal u organización.
 *
 * Se administra ENTERAMENTE en nuestra base de datos: no tiene producto ni precio en Stripe, no
 * aparece en el catálogo de `/payments/services` y no se contrata por Checkout. Hay que
 * reconocerlo por su valor porque el contrato no lo distingue de otro modo — `currentPlanType`
 * es una cadena abierta y `hasActiveSubscription` es false tanto para el plan gratuito como para
 * uno de pago que caducó, que son dos situaciones opuestas de cara al usuario.
 *
 * Espejo de `FREE_PLAN_TYPE` en signature-server.
 */
export const FREE_PLAN_TYPE = 'free';

export async function getBillingStateRequest(): Promise<BillingState> {
  const { data } = await apiClient.get<{
    success: boolean;
    message: string;
    data: BillingState;
  }>('/api/v1/payments/billing-state');

  return data.data;
}

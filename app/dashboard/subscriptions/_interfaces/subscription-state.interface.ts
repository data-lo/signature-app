/**
 * Estado del perfil de facturación, tal como lo guarda el backend en `billing_profiles`.
 *
 * Ya no viene de `account_subscriptions`: aquella tabla sobrevive por compatibilidad pero no
 * refleja la activación del pago, que hace el webhook `invoice.paid` sobre el perfil. Ese era el
 * motivo de que la pantalla siguiera diciendo "inactiva" después de pagar.
 *
 * `FREE` es el plan gratuito con el que nace toda cuenta: se administra sólo en nuestra base de
 * datos y no tiene nada en Stripe. No habilita lo que se paga, pero tampoco es un plan caducado
 * — la pantalla tiene que distinguirlo de `CANCELED`.
 */
export type BillingProfileStatus =
  'FREE' | 'INCOMPLETE' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';

/** Espejo de `UserSubscriptionState` en signature-server. */
export interface SubscriptionState {
  /** `true` sólo con `status = ACTIVE`. La pantalla no vuelve a derivarlo por su cuenta. */
  hasActiveSubscription: boolean;
  /**
   * Plan del catálogo (`basic`, `plus`, `premium`, ...). Conjunto ABIERTO que define el backend,
   * no un enum del frontend: dar de alta un plan nuevo no debe obligar a desplegar esta app.
   */
  planType: string | null;
  status: BillingProfileStatus | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
}

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
  /**
   * La baja ya está programada para el final del periodo vigente.
   *
   * Convive con `hasActiveSubscription: true` a propósito, y por eso son dos campos y no uno: la
   * suscripción sigue habilitando todo hasta `currentPeriodEnd` y lo único que cambia es que no
   * se renovará. Colapsarlos dejaría a la pantalla sin poder distinguir "activa y se renueva" de
   * "activa pero termina el día X", que es exactamente lo que el usuario necesita saber.
   */
  cancelAtPeriodEnd: boolean;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
}

/**
 * Cómo queda la renovación después de programar la baja o de reanudarla.
 *
 * Espejo de `SubscriptionScheduleResponse` en signature-server, y lo devuelven LOS DOS endpoints
 * —`/cancel` y `/resume`— con la misma forma: son la misma bandera en dos sentidos, y darles
 * respuestas distintas haría que la tarjeta se dibujara distinto según por cuál hubiera pasado el
 * usuario.
 *
 * Trae el estado ya actualizado, aunque igualmente se invalide la consulta después: describe el
 * instante de la operación, y la fuente de verdad sigue siendo el backend.
 */
export interface SubscriptionSchedule {
  status: BillingProfileStatus;
  planType: string | null;
  cancelAtPeriodEnd: boolean;
  /** Fecha efectiva de término: hasta cuándo sigue habiendo servicio. */
  currentPeriodEnd: string | null;
}

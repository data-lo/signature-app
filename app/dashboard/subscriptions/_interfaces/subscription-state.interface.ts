import type { BillingProfileStatus } from '@/lib/api/billing';

/**
 * El estado del perfil se define UNA vez, junto al resto del contrato de facturación
 * (`lib/api/billing`), y acá sólo se reexporta para quien ya lo importaba de este módulo.
 * Tenerlo escrito en dos sitios dejaría que un estado nuevo entrara en uno y no en el otro,
 * y el `Record` que rotula los estados en la tarjeta dejaría de cubrirlos todos sin que nadie
 * se enterara.
 */
export type { BillingProfileStatus };

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

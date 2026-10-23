import type { BillingAccess } from '@/lib/api/billing';
import type { PaymentService } from '../_interfaces/payment-service.interface';

/**
 * ¿Es este servicio una suscripción, y no una compra suelta?
 *
 * Lo decide la periodicidad: un precio recurrente es un plan y un pago único no lo es. Es la
 * distinción que separa lo que se bloquea de lo que no — tener un plan activo impide contratar
 * otro, pero nunca impide comprar créditos de documentos sueltos.
 *
 * @param service - Servicio del catálogo tal como llega de `/payments/services`.
 * @returns `true` si el cobro es recurrente.
 *
 * @example
 * ```ts
 * isSubscriptionPlan({ interval: 'month', ... }); // true  — plan mensual
 * isSubscriptionPlan({ interval: null, ... }); // false — paquete de documentos
 * ```
 */
export function isSubscriptionPlan(service: PaymentService): boolean {
  return service.interval !== null;
}

/**
 * ¿Es esta tarjeta el plan que la cuenta tiene contratado?
 *
 * Compara la llave del catálogo, no el nombre del producto: el nombre lo edita ventas en el
 * dashboard de Stripe cuando quiere, y casarlo por texto haría que el badge se mudara de tarjeta
 * —o desapareciera— sin que nadie tocara una línea de código.
 *
 * La comparación ignora mayúsculas y espacios porque `planType` sale de metadata escrita a mano
 * en el dashboard, mientras que `currentPlanType` sale de la tabla `plans`: un `Premium` contra
 * un `premium` son el mismo plan y no deben leerse como dos.
 *
 * @param service - Servicio del catálogo.
 * @param billing - Estado de facturación de la cuenta activa, o `undefined` si aún no se conoce.
 * @returns `true` sólo si ambos declaran el mismo plan.
 *
 * @example
 * ```ts
 * isCurrentPlan({ planType: 'Premium', ... }, { currentPlanType: 'premium', ... }); // true
 * isCurrentPlan({ planType: null, ... }, { currentPlanType: 'premium', ... }); // false
 * ```
 */
export function isCurrentPlan(
  service: PaymentService,
  billing: BillingAccess | undefined,
): boolean {
  const delCatalogo = service.planType?.trim().toLowerCase();
  const contratado = billing?.currentPlanType?.trim().toLowerCase();

  /**
   * Sin una de las dos llaves no hay coincidencia posible. Se comprueba explícitamente porque
   * `undefined === undefined` es `true`: sin esta guarda, un catálogo sin metadata y una cuenta
   * sin plan pondrían el badge "Plan actual" en TODAS las tarjetas.
   */
  if (!delCatalogo || !contratado) {
    return false;
  }

  return delCatalogo === contratado;
}

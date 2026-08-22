/**
 * Respuesta de `POST /api/v1/payments/checkout-sessions`.
 *
 * La URL es temporal: se usa para redirigir de inmediato y no se guarda ni se cachea.
 */
export interface CheckoutSession {
  checkoutUrl: string;
}

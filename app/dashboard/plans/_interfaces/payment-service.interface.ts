/**
 * Un servicio del catálogo, tal como lo devuelve `GET /api/v1/payments/services`.
 *
 * Espejo de `PaymentServiceResponse` en signature-server. Nótese lo que NO trae: ninguna URL de
 * pago. Las sesiones de Checkout son temporales y se piden al pulsar "Comprar".
 */
export interface PaymentService {
  /** `price_...`: es lo que se manda de vuelta para abrir el Checkout. */
  priceId: string;
  /**
   * Plan del catálogo al que corresponde esta tarjeta (`premium`, `plus`, ...).
   *
   * Es la misma llave que `currentPlanType` de `BillingAccess`, y sirve exactamente para eso:
   * reconocer cuál de las tarjetas es el plan que la cuenta ya tiene contratado. `null` cuando el
   * producto no declara la metadata en Stripe — entonces la tarjeta se pinta igual, sólo que sin
   * poder marcarse como plan actual.
   */
  planType: string | null;
  name: string;
  description: string | null;
  /** Importe en la unidad mínima de la moneda (centavos), como lo maneja Stripe. */
  unitAmount: number | null;
  /** Código ISO en minúsculas: `mxn`, `usd`. */
  currency: string;
  /** `month` | `year` | ...; `null` cuando es un pago único. */
  interval: string | null;
  intervalCount: number | null;
  imageUrl: string | null;
}

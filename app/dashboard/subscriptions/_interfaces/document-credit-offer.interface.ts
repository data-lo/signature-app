/**
 * Un paquete de documentos que la cuenta activa puede comprar, tal como lo devuelve
 * `GET /api/v1/payments/document-credit-offers`.
 *
 * Espejo de `DocumentCreditOfferResponse` en signature-server. **Todo sale del catálogo local**
 * sincronizado desde Stripe: ni el precio ni la cantidad de documentos se escriben en esta app.
 * Qué ofertas llegan depende del plan vigente de la cuenta, que resuelve el backend.
 */
export interface DocumentCreditOffer {
  /** Id del catálogo LOCAL. Es lo que se manda de vuelta para abrir el Checkout. */
  catalogPriceId: string;
  name: string;
  /** Documentos que acredita el paquete cuando el pago se confirma. */
  documentsGranted: number;
  /** Importe en la unidad mínima de la moneda (centavos), como en el resto del módulo. */
  amount: number;
  /** Código ISO en minúsculas: `mxn`, `usd`. */
  currency: string;
  /**
   * `price_...` del proveedor. Llega porque el contrato lo incluye, pero **no se usa para
   * comprar**: el Checkout se abre con `catalogPriceId` y es el backend quien resuelve el precio
   * de Stripe. Mandarlo desde acá permitiría cobrar un precio distinto al que se mostró.
   */
  stripePriceId: string | null;
}

/**
 * Lo que se manda para abrir el Checkout de documentos: la oferta y cuántas unidades se compran.
 *
 * Espejo de `CreateDocumentCreditCheckoutDto` en signature-server. **Son los dos únicos campos**:
 * el importe y los documentos a recibir los calcula el backend desde su catálogo, así que mandarlos
 * sólo abriría la puerta a que alguien creyera que cuentan.
 */
export interface DocumentCreditCheckoutInput {
  /** Id del catálogo LOCAL de la oferta elegida. */
  catalogPriceId: string;
  /** Unidades de la oferta, ya como número entero entre 1 y el máximo por compra. */
  quantity: number;
}

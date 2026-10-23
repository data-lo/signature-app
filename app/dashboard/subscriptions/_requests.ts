import apiClient from '@/lib/axios';
import type { SubscriptionSchedule } from './_interfaces/subscription-state.interface';
import type {
  DocumentCreditCheckoutInput,
  DocumentCreditOffer,
} from './_interfaces/document-credit-offer.interface';

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

/**
 * Paquetes de documentos que la cuenta activa puede comprar según su plan vigente.
 *
 * Sin parámetros: qué ofertas corresponden lo decide por completo el backend a partir del
 * `X-Account-Id` que manda el interceptor. Pasar el plan desde acá permitiría pedir las tarifas
 * de Premium desde una cuenta Free, que es justo lo que la regla impide.
 *
 * Una lista vacía es una respuesta normal —ese plan no tiene paquetes configurados— y no un
 * error: la pantalla la dibuja como tal.
 */
export async function getDocumentCreditOffersRequest(): Promise<
  DocumentCreditOffer[]
> {
  const { data } = await apiClient.get<{
    success: boolean;
    message: string;
    data: DocumentCreditOffer[];
  }>('/api/v1/payments/document-credit-offers');

  return data.data;
}

/**
 * Abre el Checkout para comprar uno de esos paquetes.
 *
 * Viaja el id del catálogo LOCAL y no un `price_...` de Stripe: así el backend puede validar la
 * compra contra su catálogo —que el paquete exista, esté activo y sea del plan vigente— antes de
 * tocar al proveedor, y el precio que se cobra sale de una fila suya y no de esta petición.
 *
 * Responde 404 si el paquete no le corresponde a la cuenta, incluido el caso de alguien que
 * manipule el `catalogPriceId` para intentar comprar el de otro plan, y 400 con
 * `field: 'quantity'` si la cantidad no es válida.
 *
 * **Viajan sólo `catalogPriceId` y `quantity`**, y la cantidad ya como número: el formulario la
 * transformó al validar. Se reconstruye el cuerpo en vez de reenviar el objeto recibido para que
 * ningún campo de más llegue al backend. Ni el importe ni los documentos a recibir salen de aquí:
 * los calcula el backend desde su catálogo.
 *
 * @param input - Oferta del catálogo local y unidades a comprar.
 * @returns La URL hospedada de Checkout a la que hay que mandar el navegador.
 *
 * @throws {AxiosError} Si el backend rechaza la compra: 400 (cantidad), 404 (oferta) o 502
 *   (proveedor de pagos).
 *
 * @example
 * ```ts
 * const { checkoutUrl } = await createDocumentCreditCheckoutRequest({
 *   catalogPriceId: '7f3c1f6e-2b4a-4c8d-9e15-0a1b2c3d4e5f',
 *   quantity: 5,
 * });
 * ```
 */
export async function createDocumentCreditCheckoutRequest({
  catalogPriceId,
  quantity,
}: DocumentCreditCheckoutInput): Promise<{ checkoutUrl: string }> {
  const { data } = await apiClient.post<{
    success: boolean;
    message: string;
    data: { checkoutUrl: string };
  }>('/api/v1/payments/document-credits/checkout', {
    catalogPriceId,
    quantity,
  });

  return data.data;
}

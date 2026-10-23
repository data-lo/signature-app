import type { AxiosError } from 'axios';

/** Lo que se dice cuando el backend no manda un mensaje propio (caída de red, 5xx sin cuerpo). */
export const CHECKOUT_ERROR_FALLBACK =
  'No pudimos abrir el pago. Intenta de nuevo en unos minutos.';

/**
 * Cuerpo de error de `POST /payments/document-credits/checkout`.
 *
 * `message` es una lista cuando rechaza el `ValidationPipe` y un texto en el resto de los casos.
 * `field` sólo llega cuando el rechazo es de la cantidad (`InvalidDocumentCreditQuantityException`).
 */
interface CheckoutErrorBody {
  message?: string | string[];
  field?: string;
}

/** Error de la compra ya traducido al formulario: a qué campo pertenece y qué mostrar. */
export interface DocumentCreditCheckoutServerError {
  /** Campo del formulario al que pertenece, o `null` si es de la compra en general. */
  field: 'quantity' | null;
  message: string;
}

/**
 * Traduce el error de abrir el Checkout de documentos a un campo del formulario y un mensaje.
 *
 * El campo se decide por `field` en la respuesta y **nunca por el texto del mensaje**: así el
 * backend puede cambiar la redacción sin que el error se vaya a otro sitio del formulario. Lo que
 * no trae `field` —la oferta no disponible, el proveedor caído— es un error de la compra en
 * general.
 *
 * @param error - Lo que rechazó la petición; normalmente un `AxiosError`.
 * @returns El campo afectado (`'quantity'` o `null`) y el mensaje del backend, o uno genérico si
 *   no mandó ninguno.
 *
 * @example
 * ```ts
 * const { field, message } = resolveDocumentCreditCheckoutError(error);
 * if (field === 'quantity') setError('quantity', { type: 'server', message });
 * ```
 */
export function resolveDocumentCreditCheckoutError(
  error: unknown,
): DocumentCreditCheckoutServerError {
  const body = (error as AxiosError<CheckoutErrorBody> | null)?.response?.data;
  const rawMessage = body?.message;
  const message = Array.isArray(rawMessage) ? rawMessage[0] : rawMessage;

  return {
    field: body?.field === 'quantity' ? 'quantity' : null,
    message: message?.trim() ? message : CHECKOUT_ERROR_FALLBACK,
  };
}

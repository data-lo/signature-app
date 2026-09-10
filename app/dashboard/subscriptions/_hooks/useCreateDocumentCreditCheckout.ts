'use client';

import { useMutation } from '@tanstack/react-query';
import { createDocumentCreditCheckoutRequest } from '../_requests';

/**
 * Abre el Checkout de un paquete de documentos y manda al usuario a Stripe.
 *
 * La sesión se crea al pulsar y no al listar las ofertas: cada URL de Checkout es temporal, así
 * que pedirlas por adelantado dejaría al usuario con enlaces muertos y gastaría una llamada al
 * proveedor por cada paquete que ni siquiera va a comprar.
 *
 * **Sin `throwOnError`, a diferencia del catálogo de planes.** Aquí el error se dibuja dentro del
 * diálogo: quien está comprando ya tiene una pantalla abierta con contexto, y levantar el error
 * boundary del segmento se lo llevaría por delante junto con el resto del estado de su
 * suscripción. Un fallo al abrir la sesión no ha cobrado nada y se puede reintentar en el sitio.
 *
 * Se navega con `window.location.assign()` y no con el router de Next porque Checkout vive en el
 * dominio de Stripe: no es una ruta de esta aplicación.
 */
export function useCreateDocumentCreditCheckout() {
  return useMutation({
    mutationFn: createDocumentCreditCheckoutRequest,
    onSuccess: (session) => {
      window.location.assign(session.checkoutUrl);
    },
  });
}

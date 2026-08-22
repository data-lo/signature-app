'use client';

import { useMutation } from '@tanstack/react-query';
import { createCheckoutSessionRequest } from '../_requests';

/**
 * Abre la sesión de Checkout y manda al usuario a Stripe.
 *
 * La sesión se crea acá, al pulsar "Comprar", y no al cargar el catálogo: cada URL es temporal
 * y sólo tiene sentido pedirla para el servicio que el usuario eligió.
 *
 * `throwOnError`: un fallo al crear la sesión también levanta el error boundary. La alternativa
 * —un toast— dejaría al usuario en el catálogo sin saber si su compra quedó a medias.
 *
 * Se navega con `window.location.assign()` y no con el router de Next porque Checkout vive en el
 * dominio de Stripe: no es una ruta de esta aplicación. Se deja entrada en el historial a
 * propósito —`assign` y no `replace`— para que el botón "atrás" del navegador devuelva al
 * catálogo si el usuario se arrepiente antes de pagar.
 */
export function useCreateCheckoutSession() {
  return useMutation({
    mutationFn: createCheckoutSessionRequest,
    onSuccess: (session) => {
      window.location.assign(session.checkoutUrl);
    },
    throwOnError: true,
  });
}

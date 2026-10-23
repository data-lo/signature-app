'use client';

import { useQuery } from '@tanstack/react-query';
import { getPaymentServicesRequest } from '../_requests';

export const PAYMENT_SERVICES_QUERY_KEY = ['paymentServices'];

/**
 * Catálogo de servicios comprables.
 *
 * `throwOnError`: si la consulta falla, el error sube al error boundary del segmento
 * (`error.tsx`) en lugar de resolverse dentro de la vista. Es deliberado — sin catálogo no hay
 * media pantalla que mostrar, y unas tarjetas parciales junto a un aviso de error dejarían al
 * usuario sin saber si lo que ve está completo.
 */
export function usePaymentServices() {
  return useQuery({
    queryKey: PAYMENT_SERVICES_QUERY_KEY,
    queryFn: getPaymentServicesRequest,
    throwOnError: true,
  });
}

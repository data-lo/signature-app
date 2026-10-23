'use client';

import { useMutation } from '@tanstack/react-query';
import { cancelSubscriptionRequest } from '../_requests';
import { useInvalidateBillingAccess } from './useInvalidateBillingAccess';

/**
 * Programa la baja de la suscripción de la cuenta activa.
 *
 * No hace actualización optimista. La respuesta del backend ya llega con el estado nuevo y la
 * fecha de término, así que no hay nada que adelantar; y adelantarlo sería peor, porque un 409
 * —la baja ya estaba programada— tendría que revertirse a mano justo cuando el usuario mira.
 *
 * El estado de la llamada lo consume la TARJETA, no el modal: aquél se cierra al confirmar (ver
 * `CancelSubscriptionDialog`), así que el "cancelando…" y el posible fallo tienen que dibujarse
 * donde el usuario se queda.
 */
export function useCancelSubscription() {
  const invalidate = useInvalidateBillingAccess();

  return useMutation({
    mutationFn: cancelSubscriptionRequest,
    onSuccess: invalidate,
  });
}

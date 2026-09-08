'use client';

import { useMutation } from '@tanstack/react-query';
import { resumeSubscriptionRequest } from '../_requests';
import { useInvalidateBillingAccess } from './useInvalidateBillingAccess';

/**
 * Deshace una baja programada: la suscripción vuelve a renovarse.
 *
 * Sin confirmación previa, al revés que cancelar. La asimetría es deliberada: reanudar no le
 * quita nada al usuario ni cuesta dinero inmediato —restablece lo que ya tenía— y además se puede
 * volver a cancelar en el mismo sitio. Pedir confirmación para deshacer un error sólo pondría un
 * obstáculo más entre alguien y arreglar lo que acaba de hacer sin querer.
 */
export function useResumeSubscription() {
  const invalidate = useInvalidateBillingAccess();

  return useMutation({
    mutationFn: resumeSubscriptionRequest,
    onSuccess: invalidate,
  });
}

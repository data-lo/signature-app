'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { billingAccessQueryKey } from '@/lib/hooks/useBillingAccess';

/**
 * Refresca todo lo que describe el `billing_profile` de la cuenta activa.
 *
 * **Ahora es UNA sola consulta.** Antes eran dos —la de esta pantalla y el espejo global del
 * store—, salían del mismo perfil y había que acordarse de invalidar las dos; refrescar sólo una
 * dejaba a la aplicación diciendo dos cosas distintas del mismo perfil hasta la próxima recarga.
 * Con `billingAccess` como fuente única ese desfase ya no puede darse, y este hook sobrevive
 * porque el QUÉ invalidar sigue siendo una decisión de un solo sitio.
 *
 * Hay que llamarlo después de cualquier cosa que mueva el estado comercial: programar la baja,
 * reanudarla, volver de Checkout, comprar créditos. Lo que ocurre en el servidor sin que el
 * usuario lo pida —una renovación cobrada, el término de la suscripción, un cobro manual
 * registrado por administración— no dispara nada acá y no puede: llega por webhook y esta app no
 * lo escucha. Se refleja en la siguiente consulta, que es al entrar, al cambiar de cuenta o tras
 * la siguiente operación.
 *
 * Se invalida la de ESA cuenta —va en la llave— para no tirar el caché de la otra: quien tiene
 * cuenta personal y organización no debe perder lo consultado en una por operar en la otra.
 */
export function useInvalidateBillingAccess() {
  const queryClient = useQueryClient();
  const activeAccountId = useAuthStore((state) => state.activeAccount?.id);

  return useCallback(
    () =>
      queryClient.invalidateQueries({
        queryKey: billingAccessQueryKey(activeAccountId),
      }),
    [queryClient, activeAccountId],
  );
}

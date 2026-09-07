'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { billingStateQueryKey } from '@/lib/hooks/useBillingState';
import { subscriptionStateQueryKey } from './useSubscriptionState';

/**
 * Refresca todo lo que describe el `billing_profile` de la cuenta activa.
 *
 * **Son DOS consultas y hay que invalidar las dos.** `subscriptionState` dibuja esta pantalla,
 * pero `billingState` es el espejo global que alimenta el store —menús, guards, cualquier parte
 * del árbol que pregunte por el plan sin montar una consulta— y sale del mismo perfil. Refrescar
 * sólo una dejaría la aplicación diciendo dos cosas distintas del mismo perfil hasta la próxima
 * recarga.
 *
 * Vive aparte porque lo necesitan por igual cancelar y reanudar: son operaciones inversas, pero
 * lo que dejan desactualizado es exactamente lo mismo, y tenerlo copiado en cada hook abriría la
 * puerta a que uno refrescara una consulta y el otro la otra.
 *
 * Se invalidan las de ESA cuenta —van en la llave— para no tirar el caché de la otra: quien tiene
 * cuenta personal y organización no debe perder lo consultado en una por operar en la otra.
 */
export function useInvalidateSubscriptionQueries() {
  const queryClient = useQueryClient();
  const activeAccountId = useAuthStore((state) => state.activeAccount?.id);

  return useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: subscriptionStateQueryKey(activeAccountId),
      }),
      queryClient.invalidateQueries({
        queryKey: billingStateQueryKey(activeAccountId),
      }),
    ]);
  }, [queryClient, activeAccountId]);
}

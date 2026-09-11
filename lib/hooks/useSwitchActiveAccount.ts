'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { billingAccessQueryKey } from '@/lib/hooks/useBillingAccess';
import { useAuthStore } from '@/lib/store/useAuthStore';
import type {
  AccountListEntry,
  ActiveAccount,
} from '@/lib/store/types/auth-store.types';

/**
 * Cambia la cuenta activa y obliga a volver a consultar su estado comercial.
 *
 * **Se resetea la consulta de la cuenta destino (`resetQueries`), no sólo se invalida.** Invalidar
 * dejaría en pantalla el dato cacheado de la última visita mientras llega el nuevo, y las rutas se
 * habilitarían con él: una organización que perdió su plan en otra pestaña, o una cuenta personal
 * cuyo plan cambió, se verían con el estado viejo. Al resetearla, la consulta vuelve a `pending` y
 * la guarda de rutas espera la respuesta fresca antes de mostrar nada protegido.
 *
 * Sólo se toca la llave de ESA cuenta: el caché de las demás se conserva.
 *
 * @returns Una función que recibe la cuenta a activar.
 *
 * @example
 * ```tsx
 * const switchActiveAccount = useSwitchActiveAccount();
 * <DropdownMenuItem onClick={() => switchActiveAccount(account)} />;
 * ```
 */
export function useSwitchActiveAccount() {
  const queryClient = useQueryClient();
  const setActiveAccount = useAuthStore((state) => state.setActiveAccount);

  return useCallback(
    (account: AccountListEntry | ActiveAccount) => {
      void queryClient.resetQueries({
        queryKey: billingAccessQueryKey(account.id),
        exact: true,
      });
      setActiveAccount(account);
    },
    [queryClient, setActiveAccount],
  );
}

'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getBillingStateRequest, type BillingState } from '@/lib/api/billing';
import { useAuthStore } from '@/lib/store/useAuthStore';

/**
 * La cuenta forma parte de la llave: el backend responde según el `X-Account-Id` que manda el
 * interceptor, así que sin ella el caché serviría el estado de la cuenta anterior al cambiar de
 * cuenta. Es también lo que hace que cambiar de cuenta dispare la consulta nueva sin ningún
 * efecto explícito.
 */
export function billingStateQueryKey(accountId: string | undefined) {
  return ['billingState', accountId] as const;
}

/**
 * Estado de facturación de la cuenta activa.
 *
 * Se consulta al iniciar sesión (va montado en `AuthProvider`) y se vuelve a consultar solo al
 * cambiar de cuenta, porque la cuenta está en la `queryKey`.
 *
 * **Es la consulta LIGERA**, la que cualquier parte de la aplicación necesita para saber si el
 * servicio está habilitado. La pantalla de suscripciones no usa ésta sino `useSubscriptionState`,
 * que sale del mismo perfil pero trae además el estado concreto y las fechas del periodo — y es
 * la que insiste tras volver de Checkout, porque es la que el usuario está mirando.
 *
 * Además de devolver la consulta, refleja el resultado en el store global indexado por cuenta,
 * para que cualquier parte del árbol pueda leer el plan sin montar la consulta ni provocar una
 * petición. La fuente de verdad sigue siendo esta consulta; el store es su espejo.
 */
export function useBillingState() {
  const activeAccountId = useAuthStore((state) => state.activeAccount?.id);
  const setBillingState = useAuthStore((state) => state.setBillingState);

  const query = useQuery({
    queryKey: billingStateQueryKey(activeAccountId),
    queryFn: getBillingStateRequest,
    // Sin cuenta activa la petición saldría sin `X-Account-Id` y el backend responde 400. Pasa
    // en cada carga del dashboard, mientras el tenant se rehidrata desde localStorage.
    enabled: Boolean(activeAccountId),
  });

  const { data } = query;

  useEffect(() => {
    if (activeAccountId && data) {
      setBillingState(activeAccountId, data);
    }
  }, [activeAccountId, data, setBillingState]);

  return query;
}

/**
 * Lectura sincrónica del último estado conocido de una cuenta, sin disparar ninguna petición.
 *
 * Para lo que se dibuja a partir del plan (un menú, un aviso) y no puede permitirse montar la
 * consulta. Devuelve `undefined` mientras esa cuenta no se haya consultado todavía — que es
 * distinto de "no tiene plan", y por eso no se colapsan los dos casos en un booleano.
 */
export function useKnownBillingState(
  accountId: string | undefined,
): BillingState | undefined {
  return useAuthStore((state) =>
    accountId ? state.billingByAccountId[accountId] : undefined,
  );
}

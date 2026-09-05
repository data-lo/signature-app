'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getBillingStateRequest, type BillingState } from '@/lib/api/billing';
import { useAuthStore } from '@/lib/store/useAuthStore';

/**
 * Cada cuánto se vuelve a preguntar mientras se espera la confirmación del pago, y hasta cuándo.
 *
 * La espera existe porque el retorno de Stripe NO confirma nada: quien activa el perfil es el
 * webhook `invoice.paid`, que llega por su cuenta unos segundos después. Sin esto, el usuario
 * vuelve de pagar y ve "sin plan" hasta que recargue a mano.
 *
 * El límite no es opcional: el webhook puede tardar más de la cuenta o no llegar nunca (una
 * tarjeta rechazada tras el checkout), y una consulta que se reintenta para siempre deja al
 * navegador pegándole al backend en una pestaña olvidada. Al agotarse simplemente se deja de
 * insistir — el estado que se muestra sigue siendo el real, y basta recargar para volver a mirar.
 */
export const ACTIVATION_POLL_INTERVAL_MS = 2_000;
export const ACTIVATION_POLL_TIMEOUT_MS = 30_000;

/**
 * La cuenta forma parte de la llave: el backend responde según el `X-Account-Id` que manda el
 * interceptor, así que sin ella el caché serviría el estado de la cuenta anterior al cambiar de
 * cuenta. Es también lo que hace que cambiar de cuenta dispare la consulta nueva sin ningún
 * efecto explícito.
 */
export function billingStateQueryKey(accountId: string | undefined) {
  return ['billingState', accountId] as const;
}

interface UseBillingStateOptions {
  /**
   * Insiste hasta que el perfil quede activo. Se enciende al volver de Checkout y no antes:
   * fuera de ese momento no hay ningún motivo para esperar un cambio de estado.
   */
  awaitActivation?: boolean;
}

/**
 * Estado de facturación de la cuenta activa.
 *
 * Se consulta al iniciar sesión (va montado en `AuthProvider`) y se vuelve a consultar solo al
 * cambiar de cuenta, porque la cuenta está en la `queryKey`.
 *
 * Además de devolver la consulta, refleja el resultado en el store global indexado por cuenta,
 * para que cualquier parte del árbol pueda leer el plan sin montar la consulta ni provocar una
 * petición. La fuente de verdad sigue siendo esta consulta; el store es su espejo.
 */
export function useBillingState({
  awaitActivation = false,
}: UseBillingStateOptions = {}) {
  const activeAccountId = useAuthStore((state) => state.activeAccount?.id);
  const setBillingState = useAuthStore((state) => state.setBillingState);

  /**
   * El plazo arranca cuando se enciende la espera, no cuando se monta el hook: si se midiera
   * desde el montaje, un componente que ya llevaba rato en pantalla empezaría a insistir con el
   * plazo medio consumido.
   */
  const deadline = useRef<number | null>(null);
  useEffect(() => {
    deadline.current = awaitActivation
      ? Date.now() + ACTIVATION_POLL_TIMEOUT_MS
      : null;
  }, [awaitActivation]);

  const query = useQuery({
    queryKey: billingStateQueryKey(activeAccountId),
    queryFn: getBillingStateRequest,
    // Sin cuenta activa la petición saldría sin `X-Account-Id` y el backend responde 400. Pasa
    // en cada carga del dashboard, mientras el tenant se rehidrata desde localStorage.
    enabled: Boolean(activeAccountId),
    refetchInterval: (currentQuery) => {
      if (!awaitActivation) {
        return false;
      }
      // Ya llegó el webhook: dejar de insistir es el resultado esperado, no un abandono.
      if (currentQuery.state.data?.hasActiveSubscription) {
        return false;
      }
      if (deadline.current === null || Date.now() >= deadline.current) {
        return false;
      }
      return ACTIVATION_POLL_INTERVAL_MS;
    },
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

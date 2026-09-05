'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { getSubscriptionStateRequest } from '../_requests';

/**
 * Cada cuánto se vuelve a preguntar mientras se espera la confirmación del pago, y hasta cuándo.
 *
 * La espera existe porque el retorno de Stripe NO confirma nada: quien activa el perfil es el
 * webhook `invoice.paid`, que llega por su cuenta unos segundos después. Sin esto, el usuario
 * vuelve de pagar y ve "pendiente" hasta que recargue a mano.
 *
 * El límite no es opcional: el webhook puede tardar más de la cuenta o no llegar nunca (una
 * tarjeta rechazada tras el checkout), y una consulta que se reintenta para siempre deja al
 * navegador pegándole al backend en una pestaña olvidada. Al agotarse simplemente se deja de
 * insistir — el estado que se muestra sigue siendo el real, y basta recargar para volver a mirar.
 */
export const ACTIVATION_POLL_INTERVAL_MS = 2_000;
export const ACTIVATION_POLL_TIMEOUT_MS = 30_000;

/**
 * La cuenta forma parte de la llave, y no es un detalle de caché: el backend responde según el
 * `X-Account-Id` que manda el interceptor, así que sin ella un usuario que cambia de su cuenta
 * personal a su organización seguiría viendo la suscripción de la anterior servida del caché.
 * Es también lo que hace que el cambio de cuenta dispare la consulta nueva sin ningún efecto.
 */
export function subscriptionStateQueryKey(accountId: string | undefined) {
  return ['subscriptionState', accountId] as const;
}

interface UseSubscriptionStateOptions {
  /**
   * Insiste hasta que la suscripción quede activa. Se enciende al volver de Checkout y no antes:
   * fuera de ese momento no hay ningún cambio de estado que esperar.
   */
  awaitActivation?: boolean;
}

/**
 * Estado detallado de la suscripción de la cuenta activa.
 *
 * Es la consulta que dibuja la pantalla de suscripciones: sale del mismo `billing_profile` que
 * `useBillingState` y coincide con él en `hasActiveSubscription`, pero trae además el estado
 * concreto y las fechas del periodo.
 *
 * **El sondeo tras volver de Stripe vive aquí y no en `useBillingState`** justamente por eso: lo
 * que hay que refrescar hasta que el webhook confirme es lo que el usuario está mirando. Tenerlo
 * en la otra consulta dejaría la tarjeta congelada mientras el estado global sí se actualizaba.
 */
export function useSubscriptionState({
  awaitActivation = false,
}: UseSubscriptionStateOptions = {}) {
  const activeAccountId = useAuthStore((state) => state.activeAccount?.id);

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

  return useQuery({
    queryKey: subscriptionStateQueryKey(activeAccountId),
    queryFn: getSubscriptionStateRequest,
    /**
     * Sin cuenta activa la petición saldría sin `X-Account-Id` y el backend responde 400. Pasa
     * en cada carga del dashboard, mientras el tenant se rehidrata desde localStorage (ver
     * `AuthProvider`); mismo problema que ya se corrigió en `useDocuments`.
     */
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
}

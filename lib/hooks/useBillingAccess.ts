'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getBillingAccessRequest,
  type BillingAccess,
  type PlanAction,
} from '@/lib/api/billing';
import { useAuthStore } from '@/lib/store/useAuthStore';

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
 * La cuenta forma parte de la llave: el backend responde según el `X-Account-Id` que manda el
 * interceptor, así que sin ella el caché serviría el estado de la cuenta anterior al cambiar de
 * cuenta. Es también lo que hace que cambiar de cuenta dispare la consulta nueva sin ningún
 * efecto explícito, y lo que permite invalidar una cuenta sin tirar lo consultado en la otra.
 */
export function billingAccessQueryKey(accountId: string | undefined) {
  return ['billingAccess', accountId] as const;
}

interface UseBillingAccessOptions {
  /**
   * Insiste hasta que la suscripción quede activa. Se enciende al volver de Checkout y no antes:
   * fuera de ese momento no hay ningún cambio de estado que esperar.
   */
  awaitActivation?: boolean;
}

/**
 * Estado comercial de la cuenta activa: plan, saldo, beneficios y límites.
 *
 * **Es la ÚNICA consulta de facturación de la aplicación.** Antes eran dos —`billingState` para
 * el estado global y `subscriptionState` para la pantalla de suscripciones— que salían del mismo
 * `billing_profile` con dos cachés distintos, y podían dibujarse desfasadas entre sí. Ahora
 * comparten `queryKey`: quien la monta en dos sitios comparte una sola petición y un solo dato.
 *
 * Va montada en `AuthProvider`, así que se consulta al iniciar sesión y se vuelve a consultar
 * sola al cambiar de cuenta, porque la cuenta está en la llave.
 *
 * Además de devolver la consulta, refleja el resultado en el store global indexado por cuenta,
 * para que cualquier parte del árbol pueda leer el plan sin montar la consulta ni provocar una
 * petición. La fuente de verdad sigue siendo esta consulta; el store es su espejo.
 */
export function useBillingAccess({
  awaitActivation = false,
}: UseBillingAccessOptions = {}) {
  const activeAccountId = useAuthStore((state) => state.activeAccount?.id);
  const setBillingAccess = useAuthStore((state) => state.setBillingAccess);

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
    queryKey: billingAccessQueryKey(activeAccountId),
    queryFn: getBillingAccessRequest,
    /**
     * Sin cuenta activa la petición saldría sin `X-Account-Id` y el backend responde 400. Pasa
     * en cada carga del dashboard, mientras el tenant se rehidrata desde localStorage (ver
     * `AuthProvider`).
     */
    enabled: Boolean(activeAccountId),
    /**
     * El sondeo es una opción POR OBSERVADOR, no de la consulta: sólo insiste el componente que
     * está esperando la activación (la pantalla de suscripciones tras volver de Stripe), mientras
     * el resto del árbol lee el mismo dato sin provocar peticiones.
     */
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
      setBillingAccess(activeAccountId, data);
    }
  }, [activeAccountId, data, setBillingAccess]);

  return query;
}

/**
 * Lectura sincrónica del último estado conocido de una cuenta, sin disparar ninguna petición.
 *
 * Para lo que se dibuja a partir del plan (un menú, un aviso) y no puede permitirse montar la
 * consulta. Devuelve `undefined` mientras esa cuenta no se haya consultado todavía — que es
 * distinto de "no tiene plan", y por eso no se colapsan los dos casos en un booleano.
 */
export function useKnownBillingAccess(
  accountId: string | undefined,
): BillingAccess | undefined {
  return useAuthStore((state) =>
    accountId ? state.billingByAccountId[accountId] : undefined,
  );
}

/**
 * ¿Puede la cuenta activa hacer esto?
 *
 * **Es la forma correcta de condicionar la interfaz**, y existe para que ninguna pantalla tenga
 * que escribir `planType === 'premium'`: esa condición se rompe con cada plan nuevo y obliga a
 * desplegar esta app cada vez que ventas mueve un beneficio. Acá la respuesta ya viene del
 * backend, que resuelve la tabla comercial en un solo sitio.
 *
 * Devuelve `false` mientras el estado no se haya cargado, y es deliberado: ante la duda no se
 * ofrece una acción que el backend podría rechazar. Quien necesite distinguir "todavía no sé" de
 * "no puede" —para dibujar un esqueleto en vez de un bloqueo— tiene `useKnownBillingAccess`.
 */
export function useCanPerform(action: PlanAction): boolean {
  const activeAccountId = useAuthStore((state) => state.activeAccount?.id);
  const billing = useKnownBillingAccess(activeAccountId);

  return billing?.actions[action] ?? false;
}

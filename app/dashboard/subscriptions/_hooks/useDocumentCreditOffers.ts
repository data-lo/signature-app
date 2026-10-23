'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { getDocumentCreditOffersRequest } from '../_requests';

/**
 * La cuenta forma parte de la llave por lo mismo que en `useBillingAccess`: las ofertas dependen
 * del plan de la cuenta ACTIVA, así que sin ella el caché serviría las de la cuenta anterior al
 * cambiar de cuenta — y ofrecería tarifas de Premium a quien acaba de moverse a su cuenta Free.
 */
export function documentCreditOffersQueryKey(accountId: string | undefined) {
  return ['documentCreditOffers', accountId] as const;
}

/**
 * Paquetes de documentos que la cuenta activa puede comprar.
 *
 * **Se consulta sólo cuando hace falta.** El parámetro `enabled` existe para que la pantalla no
 * pida el catálogo hasta que el usuario abra el diálogo de compra: es una consulta que sólo
 * importa en ese momento, y montarla siempre cargaría una petición a cada visita de la pantalla
 * de suscripciones para algo que casi nadie pulsa.
 *
 * Qué ofertas llegan lo decide el backend a partir del plan vigente; acá no se filtra nada.
 */
export function useDocumentCreditOffers({
  enabled = true,
}: { enabled?: boolean } = {}) {
  const activeAccountId = useAuthStore((state) => state.activeAccount?.id);

  return useQuery({
    queryKey: documentCreditOffersQueryKey(activeAccountId),
    queryFn: getDocumentCreditOffersRequest,
    /**
     * Sin cuenta activa la petición saldría sin `X-Account-Id` y el backend responde 400. Pasa en
     * cada carga del dashboard, mientras el tenant se rehidrata desde localStorage.
     */
    enabled: enabled && Boolean(activeAccountId),
  });
}

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import { getErrorMessage } from '@/lib/error-handler';

import {
  createOrganizationRequest,
  type AccountData,
} from '@/lib/api/accounts';
import { getBillingAccessRequest } from '@/lib/api/billing';
import { verifyOrganizationOwnerActivation } from '@/lib/authorization/organization-owner-activation';
import { PLANS_ROUTE } from '@/lib/billing/organization-plan-access';
import { billingAccessQueryKey } from '@/lib/hooks/useBillingAccess';
import { useSwitchActiveAccount } from '@/lib/hooks/useSwitchActiveAccount';
import { toAccountListEntry } from '@/lib/store/accounts-list.slice';
import { useAuthStore } from '@/lib/store/useAuthStore';

/** Lo que se le dice a quien acaba de crear una organización, que nace sin plan. */
export const ORGANIZATION_CREATED_MESSAGE =
  'Organización creada. Elige un plan para empezar a usarla.';

/**
 * Lo que se le dice cuando la organización se creó pero no se pudo dejar activa.
 *
 * Dice las dos cosas —que sí se creó y cómo entrar a ella— porque las dos hacen falta: sin la
 * primera el usuario vuelve a crearla y acaba con dos, y sin la segunda se queda mirando un
 * formulario sin saber qué hacer.
 */
export const ORGANIZATION_NOT_ACTIVATED_MESSAGE =
  'La organización se creó, pero no se pudo activar. Elígela en el selector de cuentas para continuar.';

/**
 * Deja cargado el estado comercial de la organización nueva antes de enseñar Planes.
 *
 * Se consulta DESPUÉS del cambio de cuenta y nunca antes: el `X-Account-Id` lo pone el
 * interceptor leyendo la cuenta activa del store, así que preguntarlo antes traería el estado de
 * la cuenta anterior y lo guardaría bajo la llave de la nueva.
 *
 * Un fallo aquí no se propaga: Planes monta la misma consulta y la vuelve a pedir, y mientras
 * tanto la guarda de rutas no deja entrar a nada protegido. Quedarse en el formulario de una
 * organización que ya existe sería mucho peor que enseñar un momento el indicador de carga.
 *
 * @param queryClient - Caché de React Query de la aplicación.
 * @param accountId - Membresía de la organización recién activada.
 * @returns Nada.
 *
 * @throws Nada: el fallo se traga a propósito.
 *
 * @example
 * ```ts
 * await prefetchBillingAccess(queryClient, account.id);
 * ```
 */
async function prefetchBillingAccess(
  queryClient: ReturnType<typeof useQueryClient>,
  accountId: string,
): Promise<void> {
  try {
    await queryClient.fetchQuery({
      queryKey: billingAccessQueryKey(accountId),
      queryFn: getBillingAccessRequest,
    });
  } catch {
    // Ver el docblock: Planes la vuelve a pedir.
  }
}

/**
 * Crea una organización, la deja activa DE VERDAD y manda al usuario a contratar su plan.
 *
 * El orden de los pasos es lo que arregla el ciclo de "acceso no autorizado" con el que se abría
 * este flujo. Antes la cuenta nueva se marcaba como activa sólo en memoria y se navegaba a
 * Planes: la cookie `HttpOnly` —que es lo único que el render del servidor lee— seguía apuntando
 * a la cuenta anterior, así que Planes resolvía los permisos del contexto equivocado y rebotaba
 * a la pantalla de acceso denegado. Ahora:
 *
 * 1. **Se agrega al catálogo de cuentas**, para que exista en el selector pase lo que pase
 *    después. Es el único paso que se hace aunque el resto falle: la organización ya está creada
 *    en el backend, y esconderla del selector sólo dejaría al usuario sin forma de llegar a ella.
 * 2. **Se cambia la cuenta activa por el camino oficial** (`useSwitchActiveAccount`), que
 *    escribe la cookie desde el servidor, revalida el layout y devuelve el contexto de
 *    autorización de la cuenta nueva. Se ESPERA a que termine.
 * 3. **Se comprueba ese contexto**: que el servidor quedó en la organización recién creada, que
 *    quien la creó es su propietario y que su rol permite contratar. Se mira lo que respondió el
 *    backend y no lo que el formulario creyó crear, que es justo la confusión de la que venía el
 *    error.
 * 4. **Se consulta el estado comercial** de la organización, ya con la cuenta sincronizada entre
 *    cliente, cookie y servidor.
 * 5. **Se navega a Planes**, lo único que una organización sin plan puede hacer.
 *
 * **Si algo de los pasos 2 o 3 falla no se navega.** El usuario se queda en el formulario —una
 * ruta que siempre puede abrir, con o sin plan— con un mensaje que dice qué pasó y cómo seguir.
 * No queda una cuenta activa a medias: la cuenta del store la escribe el propio cambio de cuenta
 * a partir del contexto del servidor, así que o cambian las dos o no cambia ninguna.
 *
 * @returns La mutación de alta; `mutate` recibe el nombre y la razón social.
 *
 * @example
 * ```tsx
 * const createOrganizationMutation = useCreateOrganization();
 * createOrganizationMutation.mutate({ name: 'Acme', organizationName: 'Acme Corp S.A. de C.V.' });
 * ```
 */
export function useCreateOrganization() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const addAccount = useAuthStore((state) => state.addAccount);
  const { switchActiveAccount } = useSwitchActiveAccount();

  return useMutation({
    mutationFn: createOrganizationRequest,
    onSuccess: async (account: AccountData) => {
      addAccount(account);

      /**
       * El caché de la cuenta anterior lo tira el propio cambio de cuenta, junto con el de la
       * nueva (ver `useSwitchActiveAccount`): no hace falta invalidarlo aquí, y hacerlo antes de
       * cambiar dejaría una revalidación en vuelo con el `X-Account-Id` a punto de cambiar.
       */
      const switched = await switchActiveAccount(toAccountListEntry(account));

      if (!switched.ok) {
        toast.error(ORGANIZATION_NOT_ACTIVATED_MESSAGE);
        return;
      }

      const activation = verifyOrganizationOwnerActivation(
        account.id,
        switched.context,
      );

      if (!activation.ok) {
        toast.error(activation.message);
        return;
      }

      await prefetchBillingAccess(queryClient, account.id);

      toast.success(ORGANIZATION_CREATED_MESSAGE);
      router.push(PLANS_ROUTE);
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(
          error,
          'Ocurrió un error al crear la organización. Intenta de nuevo.',
        ),
      );
    },
  });
}

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/error-handler';
import { createOrganizationRequest } from '@/lib/api/accounts';
import { getBillingAccessRequest } from '@/lib/api/billing';
import { billingAccessQueryKey } from '@/lib/hooks/useBillingAccess';
import { PLANS_ROUTE } from '@/lib/billing/organization-plan-access';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { toAccountListEntry } from '@/lib/store/accounts-list.slice';

/** Lo que se le dice a quien acaba de crear una organización, que nace sin plan. */
export const ORGANIZATION_CREATED_MESSAGE =
  'Organización creada. Elige un plan para empezar a usarla.';

/**
 * Crea una organización, la vuelve la cuenta activa y manda al usuario a contratar su plan.
 *
 * Al confirmarse el alta:
 *
 * 1. Inserta la organización en el catálogo de cuentas y la vuelve la cuenta activa.
 * 2. Invalida el estado comercial de la cuenta ANTERIOR: se dejó de usar y, al volver a ella, se
 *    vuelve a consultar en vez de reutilizar lo cacheado.
 * 3. Consulta el estado comercial de la organización nueva con su propio `accountId` —el
 *    interceptor ya manda su `X-Account-Id` porque es la cuenta activa—. Llega sin plan y con todas
 *    las acciones en `false`.
 * 4. Redirige a Planes, que es lo único que una organización sin plan puede hacer.
 *
 * Si la consulta del paso 3 falla, igual se redirige: la guarda de rutas la vuelve a pedir y no
 * deja entrar a nada protegido mientras tanto. Un fallo ahí no debe dejar al usuario en el
 * formulario de una organización que ya se creó.
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
  const setActiveAccount = useAuthStore((state) => state.setActiveAccount);

  return useMutation({
    mutationFn: createOrganizationRequest,
    onSuccess: async (account) => {
      const previousAccountId = useAuthStore.getState().activeAccount?.id;
      const organizationEntry = toAccountListEntry(account);

      addAccount(account);
      setActiveAccount(organizationEntry);

      if (previousAccountId) {
        await queryClient.invalidateQueries({
          queryKey: billingAccessQueryKey(previousAccountId),
          exact: true,
        });
      }

      try {
        await queryClient.fetchQuery({
          queryKey: billingAccessQueryKey(organizationEntry.id),
          queryFn: getBillingAccessRequest,
        });
      } catch {
        // La guarda de rutas la vuelve a pedir; no se detiene la redirección por esto.
      }

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

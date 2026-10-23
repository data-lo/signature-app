'use client';

import { useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

import {
  switchActiveAccountAction,
  type SwitchAccountResult,
} from '@/app/server-actions/accounts/switch-active-account.server-action';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useAuthStore } from '@/lib/store/useAuthStore';
import type {
  AccountListEntry,
  ActiveAccount,
} from '@/lib/store/types/auth-store.types';

export interface SwitchActiveAccountResult {
  /**
   * Devuelve el resultado en vez de tragárselo: hay flujos que tienen que decidir con él —al
   * crear una organización, si el cambio falla no se navega a Planes y se le explica al usuario
   * qué pasó— y no pueden hacerlo si el fallo sólo llega al `console.warn`.
   */
  switchActiveAccount: (
    account: AccountListEntry | ActiveAccount,
  ) => Promise<SwitchAccountResult>;
  /** `true` mientras el cambio está en curso: la interfaz no debe ofrecer nada durante ese rato. */
  isSwitching: boolean;
}

/**
 * Cambia la cuenta activa de punta a punta.
 *
 * El orden de los pasos es la parte importante, y es el que impide que se vean por un instante
 * los permisos de la cuenta anterior:
 *
 * 1. **Se vacían los permisos en memoria**, antes de nada. A partir de aquí `can()` responde
 *    `false` a todo, así que el menú y los botones desaparecen en vez de quedarse con lo de la
 *    cuenta que se está abandonando.
 * 2. **Se tira el caché de la cuenta anterior y el de la nueva.** El de la anterior porque ya no
 *    se va a mirar; el de la nueva porque un dato guardado de una visita previa se pintaría como
 *    actual mientras llega el fresco. Se quitan por completo (`removeQueries`) en vez de
 *    invalidarse: invalidar deja el valor viejo visible mientras revalida.
 * 3. **La Server Action escribe la cookie**, tras comprobar contra el backend que la cuenta es
 *    suya, y revalida el layout. Devuelve el contexto de autorización que resolvió para ella.
 * 4. **Se adopta ese contexto en el acto**: los permisos y la cuenta activa del store pasan a ser
 *    los de la cuenta nueva sin esperar al render del layout. Es lo que permite que quien llama
 *    navegue a otra pantalla justo después sabiendo que el cliente ya está en la cuenta correcta
 *    y que cualquier consulta que dispare saldrá con su `X-Account-Id`.
 * 5. **`router.refresh()`** vuelve a pedir el layout al servidor, que confirma lo anterior
 *    leyendo la cookie recién escrita.
 *
 * El paso 4 no fabrica permisos en el cliente: lo que se adopta es exactamente lo que respondió
 * el backend, y el paso 5 lo confirma o lo corrige.
 *
 * `isSwitching` cubre los pasos 3 a 5, que son los que tardan; el 1 es inmediato.
 *
 * @returns La función de cambio —que devuelve el resultado— y si hay uno en curso.
 *
 * @example
 * ```tsx
 * const { switchActiveAccount, isSwitching } = useSwitchActiveAccount();
 * const result = await switchActiveAccount(account);
 * if (!result.ok) toast.error(result.message);
 * ```
 */
export function useSwitchActiveAccount(): SwitchActiveAccountResult {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { authorization, clearAuthorization, applyAuthorization } =
    usePermissions();
  const setActiveAccount = useAuthStore((state) => state.setActiveAccount);
  const [isPending, startTransition] = useTransition();

  const previousAccountId = authorization?.accountId;

  const switchActiveAccount = useCallback(
    async (
      account: AccountListEntry | ActiveAccount,
    ): Promise<SwitchAccountResult> => {
      /**
       * Cambiar a la cuenta en la que ya se está no hace nada, pero tiene que responder como un
       * cambio logrado: para quien llama el resultado es el mismo —la cuenta activa es la que
       * pedía— y devolver un fallo le haría tratar como error una situación correcta.
       */
      if (account.id === previousAccountId && authorization) {
        return { ok: true, context: authorization };
      }

      clearAuthorization();

      const affectedAccountIds = [previousAccountId, account.id].filter(
        (accountId): accountId is string => Boolean(accountId),
      );

      /**
       * Se filtra por PREDICADO y no por prefijo de llave porque las llaves de este proyecto
       * llevan la cuenta en segunda posición (`['billingAccess', accountId]`,
       * `['documents', accountId, …]`): `removeQueries({ queryKey: [accountId] })` no casaría con
       * ninguna. Buscar el identificador dentro de la llave sirve para todas por igual y no
       * obliga a reordenarlas una por una.
       */
      queryClient.removeQueries({
        predicate: (query) =>
          query.queryKey.some(
            (part) =>
              typeof part === 'string' && affectedAccountIds.includes(part),
          ),
      });

      const result = await switchActiveAccountAction(account.id);

      /**
       * El contexto que devolvió el servidor se adopta ANTES de refrescar, y es lo que cierra el
       * hueco por el que se colaba el error de esta historia: a partir de aquí los permisos en
       * memoria, la cuenta activa del store y la cookie del servidor dicen los tres lo mismo, así
       * que quien llama puede navegar sin esperar al render del layout.
       */
      if (result.ok) {
        applyAuthorization(result.context);
        setActiveAccount({
          id: result.context.accountId,
          accountType: result.context.accountType,
          organizationId: result.context.organizationId,
          roleId: result.context.roleId,
        });
      }

      /**
       * Se refresca incluso cuando el cambio falla: la Server Action ya limpió la cookie si la
       * cuenta dejó de ser suya, y sin el refresco la pantalla se quedaría sin permisos y sin
       * nadie que se los devolviera.
       */
      startTransition(() => {
        router.refresh();
      });

      if (!result.ok) {
        console.warn('[switch-active-account]', result.message);
      }

      return result;
    },
    [
      previousAccountId,
      authorization,
      clearAuthorization,
      applyAuthorization,
      setActiveAccount,
      queryClient,
      router,
    ],
  );

  return { switchActiveAccount, isSwitching: isPending };
}

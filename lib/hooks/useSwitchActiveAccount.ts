'use client';

import { useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

import { switchActiveAccountAction } from '@/app/server-actions/accounts/switch-active-account.server-action';
import { usePermissions } from '@/lib/hooks/usePermissions';
import type {
  AccountListEntry,
  ActiveAccount,
} from '@/lib/store/types/auth-store.types';

export interface SwitchActiveAccountResult {
  switchActiveAccount: (
    account: AccountListEntry | ActiveAccount,
  ) => Promise<void>;
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
 *    suya, y revalida el layout.
 * 4. **`router.refresh()`** vuelve a pedir el layout al servidor, que resuelve los permisos de la
 *    cuenta nueva y los hidrata.
 *
 * `isSwitching` cubre los pasos 3 y 4, que son los que tardan; el 1 es inmediato.
 *
 * @returns La función de cambio y si hay uno en curso.
 *
 * @example
 * ```tsx
 * const { switchActiveAccount, isSwitching } = useSwitchActiveAccount();
 * <DropdownMenuItem disabled={isSwitching} onClick={() => switchActiveAccount(account)} />;
 * ```
 */
export function useSwitchActiveAccount(): SwitchActiveAccountResult {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { authorization, clearAuthorization } = usePermissions();
  const [isPending, startTransition] = useTransition();

  const previousAccountId = authorization?.accountId;

  const switchActiveAccount = useCallback(
    async (account: AccountListEntry | ActiveAccount) => {
      if (account.id === previousAccountId) return;

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
            (part) => typeof part === 'string' && affectedAccountIds.includes(part),
          ),
      });

      const result = await switchActiveAccountAction(account.id);

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
    },
    [previousAccountId, clearAuthorization, queryClient, router],
  );

  return { switchActiveAccount, isSwitching: isPending };
}

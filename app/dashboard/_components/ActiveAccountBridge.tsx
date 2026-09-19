'use client';

import { useEffect, useRef } from 'react';

import { switchActiveAccountAction } from '@/app/server-actions/accounts/switch-active-account.server-action';
import type { AuthorizationContext } from '@/lib/authorization/authorization.types';
import { useAuthStore } from '@/lib/store/useAuthStore';

interface ActiveAccountBridgeProps {
  /** Contexto que resolvió el servidor; `null` si no se pudo resolver ninguna cuenta. */
  context: AuthorizationContext | null;
  /**
   * `true` cuando el servidor tuvo que deducir la cuenta porque la cookie no existía. Un Server
   * Component no puede escribir cookies, así que la confirmación se hace desde aquí.
   */
  needsCookiePersisted: boolean;
}

/**
 * Mantiene al cliente de acuerdo con la cuenta que resolvió el servidor.
 *
 * Hace dos cosas, las dos consecuencia de haber movido la cuenta activa a una cookie `HttpOnly`:
 *
 * 1. **Refleja la cuenta del servidor en el store.** El store dejó de ser la fuente de verdad
 *    —ya no persiste nada— pero lo siguen leyendo las pantallas del dashboard para componer sus
 *    `queryKey` y sus rutas. En vez de reescribir esos cuarenta y tantos consumidores, el store
 *    pasa a ser un espejo de lo que dijo el servidor.
 * 2. **Persiste la cookie la primera vez.** Cuando alguien entra sin cookie —primera visita, o
 *    alguien que venía de la versión que la guardaba en `localStorage`—, el servidor resuelve su
 *    cuenta personal y la usa para este render, pero no puede escribirla. Este efecto la confirma
 *    con la Server Action, que revalida el layout; en el render siguiente ya viene de la cookie y
 *    no vuelve a dispararse.
 *
 * El `useRef` impide que la confirmación se repita si React vuelve a montar el efecto (modo
 * estricto en desarrollo) antes de que llegue la revalidación.
 *
 * No renderiza nada: es sincronización, no interfaz.
 */
export default function ActiveAccountBridge({
  context,
  needsCookiePersisted,
}: ActiveAccountBridgeProps) {
  const setActiveAccount = useAuthStore((state) => state.setActiveAccount);
  const clearActiveAccount = useAuthStore((state) => state.clearActiveAccount);
  const hasPersistedCookie = useRef(false);

  useEffect(() => {
    if (!context) {
      clearActiveAccount();
      return;
    }

    setActiveAccount({
      id: context.accountId,
      accountType: context.accountType,
      organizationId: context.organizationId,
      roleId: context.roleId,
    });
  }, [context, setActiveAccount, clearActiveAccount]);

  useEffect(() => {
    if (!context || !needsCookiePersisted || hasPersistedCookie.current) return;

    hasPersistedCookie.current = true;
    void switchActiveAccountAction(context.accountId);
  }, [context, needsCookiePersisted]);

  return null;
}

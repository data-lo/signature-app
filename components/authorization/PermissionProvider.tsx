'use client';

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type {
  AuthorizationContext,
  PermissionKey,
} from '@/lib/authorization/authorization.types';
import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
} from '@/lib/authorization/permissions';

export interface PermissionContextValue {
  authorization: AuthorizationContext | null;
  /** `true` mientras se está cambiando de cuenta y los permisos viejos ya no valen. */
  isSwitchingAccount: boolean;
  can: (permission: PermissionKey) => boolean;
  canAny: (permissions: readonly PermissionKey[]) => boolean;
  canAll: (permissions: readonly PermissionKey[]) => boolean;
  /** Vacía los permisos ANTES de cambiar de cuenta. Ver `useSwitchActiveAccount`. */
  clearAuthorization: () => void;
}

export const PermissionContext = createContext<PermissionContextValue | null>(
  null,
);

interface PermissionProviderProps {
  /** Contexto resuelto en el servidor durante el render del layout. */
  initialContext: AuthorizationContext | null;
  children: ReactNode;
}

/**
 * Guarda en memoria los permisos efectivos de la cuenta activa y responde `can`/`canAny`/`canAll`.
 *
 * **Sólo en memoria.** Nada de `localStorage`, `sessionStorage` ni cookies legibles: un permiso
 * persistido sobrevive al cambio de rol, al cambio de cuenta y al cierre de sesión, y cualquiera
 * puede editarlo para que la interfaz le ofrezca acciones que el backend va a rechazar. Al
 * recargar, los permisos vuelven del servidor con el resto del layout, que es la única fuente.
 *
 * **No autoriza nada.** Lo único que decide es qué se dibuja. Cada endpoint vuelve a validar su
 * permiso, y editar este estado desde las herramientas del navegador no da acceso a nada: como
 * mucho enseña un botón que responderá 403.
 *
 * El contexto se re-sincroniza cuando cambia `initialContext`, es decir cuando el servidor vuelve
 * a renderizar el layout tras un `router.refresh()`. Ese efecto es lo que cierra el cambio de
 * cuenta: el cliente vacía los permisos, el servidor manda los nuevos, y aquí se adoptan.
 */
export function PermissionProvider({
  initialContext,
  children,
}: PermissionProviderProps) {
  const [authorization, setAuthorization] = useState<AuthorizationContext | null>(
    initialContext,
  );
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);

  useEffect(() => {
    setAuthorization(initialContext);
    setIsSwitchingAccount(false);
  }, [initialContext]);

  const clearAuthorization = useCallback(() => {
    setAuthorization(null);
    setIsSwitchingAccount(true);
  }, []);

  const permissions = useMemo(
    () => authorization?.permissions ?? [],
    [authorization],
  );

  /**
   * Sin contexto no se puede nada. Es el estado del cambio de cuenta a medio hacer, y fallar
   * cerrado es lo que impide que durante ese instante se vean los permisos de la cuenta
   * anterior.
   */
  const can = useCallback(
    (permission: PermissionKey) => hasPermission(permissions, permission),
    [permissions],
  );

  const canAny = useCallback(
    (required: readonly PermissionKey[]) =>
      hasAnyPermission(permissions, required),
    [permissions],
  );

  const canAll = useCallback(
    (required: readonly PermissionKey[]) =>
      hasAllPermissions(permissions, required),
    [permissions],
  );

  const value = useMemo(
    () => ({
      authorization,
      isSwitchingAccount,
      can,
      canAny,
      canAll,
      clearAuthorization,
    }),
    [authorization, isSwitchingAccount, can, canAny, canAll, clearAuthorization],
  );

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

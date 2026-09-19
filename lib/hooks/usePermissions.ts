'use client';

import { useContext } from 'react';

import {
  PermissionContext,
  type PermissionContextValue,
} from '@/components/authorization/PermissionProvider';

/**
 * Permisos efectivos de la cuenta activa.
 *
 * Lanza si se usa fuera del `PermissionProvider` en vez de devolver un contexto vacío: un
 * componente que pregunta por permisos donde nadie los proveyó no está "sin permisos", está mal
 * colocado, y devolver `false` a todo lo escondería como si fuera una pantalla legítimamente
 * restringida.
 *
 * @returns `authorization`, `can`, `canAny`, `canAll`, `isSwitchingAccount` y `clearAuthorization`.
 *
 * @throws {Error} Si se llama fuera del árbol de `PermissionProvider`.
 *
 * @example
 * ```tsx
 * const { can } = usePermissions();
 * return can('BILLING.MANAGE') ? <Button>Administrar plan</Button> : null;
 * ```
 */
export function usePermissions(): PermissionContextValue {
  const context = useContext(PermissionContext);

  if (!context) {
    throw new Error(
      'usePermissions debe usarse dentro de <PermissionProvider>. ' +
        'El layout del dashboard lo monta con los permisos que resolvió el servidor.',
    );
  }

  return context;
}

import type { ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { PermissionProvider } from '@/components/authorization/PermissionProvider';
import {
  SYSTEM_ROLE_NAME,
  type AuthorizationContext,
  type PermissionKey,
} from '@/lib/authorization/authorization.types';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

interface ProvidersOptions extends RenderOptions {
  /**
   * Permisos con los que se monta el árbol. Por defecto NINGUNO: si una prueba no dice qué puede
   * hacer su usuario, lo correcto es que no pueda nada — así una pantalla que se le olvidó
   * proteger se nota, en vez de pasar porque el helper era generoso.
   */
  permissions?: readonly PermissionKey[];
  /** Cuenta activa del contexto, cuando la prueba mira algo que dependa de ella. */
  authorization?: Partial<AuthorizationContext>;
}

/**
 * Renderiza con los proveedores que el dashboard monta de verdad: React Query y los permisos.
 *
 * El `PermissionProvider` va aquí y no en cada prueba porque `usePermissions` lanza fuera de su
 * árbol: sin él, cualquier componente que pregunte por un permiso reventaría con un error de
 * montaje que no tiene nada que ver con lo que se está probando.
 *
 * @param ui - Lo que se renderiza.
 * @param options - Opciones de Testing Library más `permissions` y `authorization`.
 * @returns Lo que devuelve `render`.
 *
 * @example
 * ```tsx
 * renderWithProviders(<BillingActions />, { permissions: ['BILLING.READ'] });
 * ```
 */
export function renderWithProviders(
  ui: ReactElement,
  { permissions = [], authorization, ...options }: ProvidersOptions = {},
) {
  const queryClient = createTestQueryClient();

  const context: AuthorizationContext = {
    accountId: 'account-1',
    accountType: 'ORGANIZATION',
    organizationId: 'org-1',
    roleId: 'role-1',
    roleName: SYSTEM_ROLE_NAME.OWNER,
    permissions: [...permissions],
    ...authorization,
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <PermissionProvider initialContext={context}>{ui}</PermissionProvider>
    </QueryClientProvider>,
    options,
  );
}

export * from '@testing-library/react';

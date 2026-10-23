'use client';

import type { ReactNode } from 'react';

import type { PermissionKey } from '@/lib/authorization/authorization.types';
import { usePermissions } from '@/lib/hooks/usePermissions';

interface CanProps {
  /** Capacidad exigida. Excluyente con `anyOf`. */
  permission?: PermissionKey;
  /** Basta con una de estas. Excluyente con `permission`. */
  anyOf?: readonly PermissionKey[];
  /** Qué enseñar cuando no se tiene el permiso. Por defecto, nada. */
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Enseña a sus hijos sólo si la cuenta activa tiene el permiso.
 *
 * **No es una barrera de seguridad, es una decisión de presentación.** Lo que hay dentro llega al
 * navegador de todas formas si el bundle lo incluye, y ocultarlo no impide llamar al endpoint: lo
 * que impide llamarlo es el Guard del backend. Sirve para no ofrecer un botón que va a responder
 * 403, que es un asunto de cortesía con el usuario, no de protección.
 *
 * Por eso tampoco sustituye a `assertPagePermission`: aquello decide si se entra a una pantalla,
 * en el servidor; esto decide si se dibuja un control dentro de una a la que ya se entró.
 *
 * @example
 * ```tsx
 * <Can permission="BILLING.MANAGE">
 *   <Button>Administrar plan</Button>
 * </Can>
 * ```
 */
export function Can({ permission, anyOf, fallback = null, children }: CanProps) {
  const { can, canAny } = usePermissions();

  const allowed = permission ? can(permission) : canAny(anyOf ?? []);

  return <>{allowed ? children : fallback}</>;
}

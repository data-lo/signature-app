import type { NavigationItem, PermissionKey } from './authorization.types';
import { hasAnyPermission } from './permissions';

/**
 * Qué permiso pide cada sección del dashboard.
 *
 * Es un catálogo aparte del menú a propósito. `AppSidebar` decide cómo se ve cada entrada —icono,
 * orden, agrupación, si depende del plan contratado— y aquí sólo se responde una pregunta:
 * **qué tiene que poder hacer alguien para que esa sección tenga sentido para él**. Separarlo deja
 * los permisos legibles de un vistazo, sin tener que leer un componente de trescientas líneas, y
 * permite probar la regla sin renderizar nada.
 *
 * Se indexa por nombre y no por `href` porque el destino de algunas entradas depende de la
 * organización activa (`/dashboard/organizations/:organizationId/members`): la ruta no es estable,
 * el nombre sí.
 */
export const DASHBOARD_NAVIGATION = {
  documents: {
    label: 'Documentos',
    href: '/dashboard/documents',
    anyPermissions: ['DOCUMENT.READ_OWN', 'DOCUMENT.READ_ORGANIZATION'],
  },
  plans: {
    label: 'Planes',
    href: '/dashboard/plans',
    anyPermissions: ['BILLING.READ'],
  },
  subscriptions: {
    label: 'Suscripciones',
    href: '/dashboard/subscriptions',
    anyPermissions: ['BILLING.READ'],
  },
  members: {
    label: 'Administrar miembros',
    href: '/dashboard/organizations',
    anyPermissions: ['MEMBER.READ'],
  },
  roles: {
    label: 'Roles y permisos',
    href: '/dashboard/organization/settings/roles',
    anyPermissions: ['ROLE.READ'],
  },
  organizationPermissions: {
    label: 'Permisos de la organización',
    href: '/dashboard/organization/settings/permissions',
    anyPermissions: ['ORGANIZATION.READ'],
  },
} as const satisfies Record<string, NavigationItem>;

/**
 * El catálogo como lista, para recorrerlo o probarlo entero.
 *
 * @example
 * ```ts
 * visibleNavigation(dashboardNavigation, permissions);
 * ```
 */
export const dashboardNavigation: readonly NavigationItem[] =
  Object.values(DASHBOARD_NAVIGATION);

/**
 * Las secciones que una cuenta con esos permisos puede ver.
 *
 * @param items - Secciones candidatas.
 * @param permissions - Permisos efectivos de la cuenta activa.
 * @returns Las secciones autorizadas, en su orden original.
 *
 * @example
 * ```ts
 * visibleNavigation(dashboardNavigation, ['DOCUMENT.READ_OWN']);
 * // [{ label: 'Documentos', … }]
 * ```
 */
export function visibleNavigation(
  items: readonly NavigationItem[],
  permissions: readonly PermissionKey[],
): NavigationItem[] {
  return items.filter((item) =>
    hasAnyPermission(permissions, item.anyPermissions),
  );
}

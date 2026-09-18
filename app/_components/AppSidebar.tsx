'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileSignature,
  CreditCard,
  ReceiptText,
  User,
  IdCard,
  Users,
  KeyRound,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/theme-toggle';
import { useLogout } from '@/lib/hooks/useLogout';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useOrganizationPlanAccess } from '@/lib/hooks/useOrganizationPlanAccess';
import { PLANS_ROUTE } from '@/lib/billing/organization-plan-access';
import type { AccountKind } from '@/lib/store/types/auth-store.types';
import type { PermissionKey } from '@/lib/authorization/authorization.types';
import { DASHBOARD_NAVIGATION } from '@/lib/authorization/navigation-permissions';
import { hasAnyPermission } from '@/lib/authorization/permissions';
import { usePermissions } from '@/lib/hooks/usePermissions';
import {
  DOCUMENTS_NAV_SECTIONS,
  DOCUMENTS_SECTIONS,
} from '@/app/dashboard/documents/_config/sections';
import { NAV_GROUP_LABELS } from '@/app/dashboard/_config/nav-groups';
import AccountSwitcher from './AccountSwitcher';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
  /**
   * Destino que depende de la organización activa. Lo necesitan las secciones renderizadas en el
   * servidor, que llevan el `organizationId` en la ruta porque el servidor no puede leer la
   * cuenta activa: vive en `localStorage`. Sólo se usa en grupos `orgOnly`, donde esa cuenta
   * existe por definición.
   */
  buildHref?: (organizationId: string) => string;
  /**
   * Capacidades que dan derecho a ver la entrada; basta con UNA. Las declara
   * `navigation-permissions.ts`, que es donde vive el mapa de sección → permiso; aquí sólo se
   * referencian, para que icono y permiso no acaben en dos verdades distintas.
   *
   * Omitirlo significa "visible para cualquiera con sesión", y sólo lo omiten las entradas del
   * perfil: son datos del propio usuario, no de la cuenta, y no hay permiso del catálogo que las
   * gobierne.
   */
  anyPermissions?: readonly PermissionKey[];
}

export interface NavGroup {
  /** Identidad estable del grupo; también sirve de `key` cuando no lleva encabezado. */
  key: string;
  /**
   * Encabezado del grupo, de `NAV_GROUP_LABELS` para que diga exactamente lo mismo que el primer
   * nivel del breadcrumb de sus pantallas. Opcional: el de documentos no lo lleva porque su
   * entrada principal se llama igual, y "Documentos > Documentos" es un nivel que no informa de
   * nada.
   */
  label?: string;
  items: NavItem[];
  /** Solo visible con una cuenta activa de tipo ORGANIZATION (mismo gate que InviteMemberModal). */
  orgOnly?: boolean;
  /**
   * Visible también para una organización sin plan: las pantallas donde lo contrata (Pagos) y
   * las de administración de la organización, que no dependen del plan.
   */
  availableWithoutPlan?: boolean;
}

export const NAV_GROUPS: NavGroup[] = [
  {
    key: 'documents',
    // Nombres y rutas salen de la configuración compartida del módulo, la misma que usa
    // DashboardBreadcrumbs. Una sola entrada: el módulo entero se representa con "Documentos".
    // El alta dejó de ser una entrada hermana —se entra por el botón de la propia pantalla— y
    // por eso no está en DOCUMENTS_NAV_SECTIONS.
    items: DOCUMENTS_NAV_SECTIONS.map((section) => ({
      label: section.label,
      href: section.href,
      icon: section.icon,
      // La entrada marca todo su sub-árbol, no sólo su propia ruta: el alta y el detalle de un
      // documento son pantallas del módulo, y dejar "Documentos" apagado mientras se está
      // dentro de él haría parecer que se salió de la sección.
      isActive: (pathname: string) =>
        pathname === section.href || pathname.startsWith(`${section.href}/`),
      anyPermissions: DASHBOARD_NAVIGATION.documents.anyPermissions,
    })),
  },
  {
    key: 'payments',
    label: NAV_GROUP_LABELS.payments,
    availableWithoutPlan: true,
    items: [
      {
        label: 'Planes',
        href: '/dashboard/plans',
        icon: CreditCard,
        isActive: (pathname) => pathname.startsWith('/dashboard/plans'),
        anyPermissions: DASHBOARD_NAVIGATION.plans.anyPermissions,
      },
      {
        label: 'Suscripciones',
        href: '/dashboard/subscriptions',
        icon: ReceiptText,
        isActive: (pathname) => pathname.startsWith('/dashboard/subscriptions'),
        anyPermissions: DASHBOARD_NAVIGATION.subscriptions.anyPermissions,
      },
    ],
  },
  {
    key: 'settings',
    label: NAV_GROUP_LABELS.settings,
    items: [
      {
        label: 'Información personal',
        href: '/dashboard/personal-documents',
        icon: User,
        isActive: (pathname) => pathname === '/dashboard/personal-documents',
      },
      {
        label: 'Identidad y firma',
        href: '/dashboard/personal-documents/identity',
        icon: IdCard,
        isActive: (pathname) =>
          pathname === '/dashboard/personal-documents/identity',
      },
    ],
  },
  {
    key: 'organization',
    label: NAV_GROUP_LABELS.organization,
    orgOnly: true,
    /**
     * Visible también sin plan: quien crea una organización queda como su administrador en el
     * acto, y esconderle la administración hasta que pague lo dejaba con un menú de una sola
     * opción —Planes— en la organización que acaba de crear. Lo que el plan habilita es operar
     * (documentos y firmas); repartir accesos es administrarla, y el backend nunca lo condicionó
     * al plan.
     */
    availableWithoutPlan: true,
    items: [
      {
        label: 'Administrar miembros',
        // Respaldo inerte: este grupo es `orgOnly`, así que `buildHref` siempre tiene con qué
        // construir el destino real.
        href: '/dashboard/documents',
        buildHref: (organizationId) =>
          `/dashboard/organizations/${organizationId}/members`,
        icon: Users,
        isActive: (pathname) =>
          /^\/dashboard\/organizations\/[^/]+\/members$/.test(pathname),
        anyPermissions: DASHBOARD_NAVIGATION.members.anyPermissions,
      },
      {
        label: 'Roles y permisos',
        href: '/dashboard/organization/settings/roles',
        icon: KeyRound,
        isActive: (pathname) =>
          pathname === '/dashboard/organization/settings/roles',
        anyPermissions: DASHBOARD_NAVIGATION.roles.anyPermissions,
      },
    ],
  },
];

/**
 * Filtra el menú para la cuenta activa: primero por permisos, después por contexto.
 *
 * **Los permisos mandan sobre todo lo demás.** Una entrada cuyo permiso no se tiene desaparece,
 * venga de donde venga el grupo y esté el plan contratado o no: es lo único que responde "¿esto
 * es tuyo?". Un grupo que se queda sin entradas visibles no se pinta — un encabezado solo, sin
 * nada debajo, sólo informa de que existe algo a lo que no se llega.
 *
 * Después siguen los dos filtros que ya había, que no hablan de permisos sino de contexto: los
 * grupos de organización sólo aparecen con una organización activa, y si esa organización todavía
 * no tiene plan quedan sólo los marcados `availableWithoutPlan` —Pagos, donde lo contrata, y
 * Organización, que su administrador puede usar desde el alta—, porque las rutas operativas
 * mandarían de vuelta a Planes. Mientras se consulta el plan (`lockedWithoutPlan` en `false`) se
 * muestra todo, para que el menú no se reacomode con cada cambio de cuenta.
 *
 * Una lista de permisos VACÍA esconde todo lo que exija alguno. Es el estado del cambio de cuenta
 * a medio hacer, y fallar cerrado es justo lo que evita enseñar por un instante el menú de la
 * cuenta anterior.
 *
 * @param groups - Todos los grupos del menú.
 * @param options.accountType - Tipo de la cuenta activa; `undefined` mientras se resuelve.
 * @param options.lockedWithoutPlan - Si la cuenta activa es una organización sin plan.
 * @param options.permissions - Permisos efectivos de la cuenta activa.
 * @returns Los grupos visibles, con sus entradas ya filtradas y en su orden original.
 *
 * @example
 * ```ts
 * visibleNavGroups(NAV_GROUPS, {
 *   accountType: 'ORGANIZATION',
 *   lockedWithoutPlan: false,
 *   permissions: ['DOCUMENT.READ_OWN'],
 * }); // sólo Documentos
 * ```
 */
export function visibleNavGroups(
  groups: NavGroup[],
  {
    accountType,
    lockedWithoutPlan,
    permissions,
  }: {
    accountType: AccountKind | undefined;
    lockedWithoutPlan: boolean;
    permissions: readonly PermissionKey[];
  },
): NavGroup[] {
  return groups
    .filter((group) => !group.orgOnly || accountType === 'ORGANIZATION')
    .filter((group) => !lockedWithoutPlan || group.availableWithoutPlan)
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          !item.anyPermissions ||
          hasAnyPermission(permissions, item.anyPermissions),
      ),
    }))
    .filter((group) => group.items.length > 0);
}

export default function AppSidebar() {
  const pathname = usePathname();
  const logoutMutation = useLogout();
  const { data: currentUser } = useCurrentUser();
  const activeAccount = useAuthStore((state) => state.activeAccount);
  const lockedWithoutPlan = useOrganizationPlanAccess() === 'locked';
  const { authorization } = usePermissions();

  /**
   * Bug corregido: este componente vive dentro de `<Suspense fallback={null}>` (ver
   * app/dashboard/layout.tsx, requerido por `useSearchParams()`), mientras que otros componentes
   * de la misma página (p. ej. CreateDocumentView) también llaman `useCurrentUser()` — comparten
   * la misma query key ('currentUser') fuera de ese boundary. React puede hidratar ese
   * sub-árbol suspendido en un momento distinto al del resto de la página: si el otro
   * componente ya resolvió la query para cuando este boundary hidrata, el primer render del
   * cliente ve datos ya disponibles mientras el HTML de SSR (congelado antes de que cualquier
   * fetch pudiera resolver) todavía dice "Cargando..." — mismatch de hidratación. Igual que ya
   * se hace con `activeAccount` (`skipHydration` + rehidratación manual en `AuthProvider`), se
   * fuerza el estado de carga en el primer render del cliente y solo se refleja el dato real
   * después de montar.
   */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              // La marca lleva al inicio del producto: el listado de documentos. Antes apuntaba
              // al alta, cuando crear era una entrada de menú por derecho propio.
              render={
                <Link
                  href={
                    lockedWithoutPlan
                      ? PLANS_ROUTE
                      : DOCUMENTS_SECTIONS.list.href
                  }
                />
              }
            >
              <FileSignature className="text-emerald-500" />
              <span className="font-heading font-semibold">Firmalo</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {visibleNavGroups(NAV_GROUPS, {
          accountType: activeAccount?.accountType,
          lockedWithoutPlan,
          permissions: authorization?.permissions ?? [],
        }).map((group) => (
          <SidebarGroup key={group.key}>
            {group.label && (
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      isActive={item.isActive(pathname)}
                      tooltip={item.label}
                      render={
                        <Link
                          href={
                            item.buildHref && activeAccount?.organizationId
                              ? item.buildHref(activeAccount.organizationId)
                              : item.href
                          }
                        />
                      }
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center justify-between gap-2 px-2 group-data-[collapsible=icon]:hidden">
          <ThemeToggle className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" />
          <AccountSwitcher />
        </div>

        <Separator className="my-1 group-data-[collapsible=icon]:hidden" />

        <div className="flex flex-col gap-0.5 rounded-md px-2 py-1.5 group-data-[collapsible=icon]:hidden">
          <p className="break-words text-sm font-medium text-foreground">
            {mounted && currentUser
              ? `${currentUser.firstName} ${currentUser.lastName}`
              : 'Cargando...'}
          </p>
          <p className="break-words text-xs text-muted-foreground">
            {mounted ? (currentUser?.email ?? '—') : '—'}
          </p>
        </div>

        <Separator className="my-1 group-data-[collapsible=icon]:hidden" />

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Cerrar sesión"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              <LogOut />
              <span>
                {logoutMutation.isPending
                  ? 'Cerrando sesión...'
                  : 'Cerrar sesión'}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

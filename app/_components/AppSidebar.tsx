'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileSignature,
  CreditCard,
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
import {
  DOCUMENTS_GROUP_LABEL,
  DOCUMENTS_NAV_SECTIONS,
  DOCUMENTS_SECTIONS,
} from '@/app/dashboard/documents/_config/sections';
import AccountSwitcher from './AccountSwitcher';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
  /** Solo visible con una cuenta activa de tipo ORGANIZATION (mismo gate que InviteMemberModal). */
  orgOnly?: boolean;
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: DOCUMENTS_GROUP_LABEL,
    // Nombres y rutas salen de la configuración compartida del módulo, la misma que usa
    // DashboardBreadcrumbs: cada sección tiene su propia ruta, así que el estado activo es
    // simplemente la coincidencia exacta del pathname.
    items: DOCUMENTS_NAV_SECTIONS.map((section) => ({
      label: section.label,
      href: section.href,
      icon: section.icon,
      isActive: (pathname: string) => pathname === section.href,
    })),
  },
  {
    label: 'Pagos',
    items: [
      {
        label: 'Suscripciones',
        href: '/dashboard/plans',
        icon: CreditCard,
        isActive: (pathname) => pathname.startsWith('/dashboard/plans'),
      },
    ],
  },
  {
    label: 'Configuración',
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
    label: 'Organización',
    orgOnly: true,
    items: [
      {
        label: 'Administrar miembros',
        href: '/dashboard/organization/settings/members',
        icon: Users,
        isActive: (pathname) =>
          pathname === '/dashboard/organization/settings/members',
      },
      {
        label: 'Permisos',
        href: '/dashboard/organization/settings/permissions',
        icon: KeyRound,
        isActive: (pathname) =>
          pathname === '/dashboard/organization/settings/permissions',
      },
    ],
  },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const logoutMutation = useLogout();
  const { data: currentUser } = useCurrentUser();
  const activeAccount = useAuthStore((state) => state.activeAccount);

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
              render={<Link href={DOCUMENTS_SECTIONS.create.href} />}
            >
              <FileSignature className="text-emerald-500" />
              <span className="font-heading font-semibold">Firmalo</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {NAV_GROUPS.filter(
          (group) =>
            !group.orgOnly || activeAccount?.accountType === 'ORGANIZATION',
        ).map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      isActive={item.isActive(pathname)}
                      tooltip={item.label}
                      render={<Link href={item.href} />}
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

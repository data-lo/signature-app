'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  FileSignature,
  FilePlus,
  Clock,
  Folder,
  FileCheck,
  CreditCard,
  Settings,
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
import type { AccountKind } from '@/lib/store/types/auth-store.types';
import AccountSwitcher from './AccountSwitcher';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  isActive: (pathname: string, status: string | null) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Configuración de documento',
    href: '/documents/create',
    icon: FilePlus,
    isActive: (pathname) => pathname === '/documents/create',
  },
  {
    label: 'Documentos pendientes de firma',
    href: '/documents?status=pending',
    icon: Clock,
    isActive: (pathname, status) =>
      pathname === '/documents' && status !== 'signed',
  },
  {
    label: 'Documentos creados',
    href: '/documents/created',
    icon: Folder,
    isActive: (pathname) => pathname === '/documents/created',
  },
  {
    label: 'Documentos firmados',
    href: '/documents?status=signed',
    icon: FileCheck,
    isActive: (pathname, status) =>
      pathname === '/documents' && status === 'signed',
  },
  {
    label: 'Suscripciones',
    href: '/plans',
    icon: CreditCard,
    isActive: (pathname) => pathname.startsWith('/plans'),
  },
  {
    label: 'Configuración',
    href: '/personal-documents',
    icon: Settings,
    isActive: (pathname) => pathname.startsWith('/personal-documents'),
  },
];

const ACCOUNT_TYPE_LABELS: Record<AccountKind, string> = {
  PERSONAL: 'Personal',
  ORGANIZATION: 'Empresarial',
};

export default function AppSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const status = searchParams.get('status');
  const logoutMutation = useLogout();
  const { data: currentUser } = useCurrentUser();
  const activeAccount = useAuthStore((state) => state.activeAccount);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/documents/create" />}>
              <FileSignature className="text-emerald-500" />
              <span className="font-heading font-semibold">Firmalo</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Documentos</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    isActive={item.isActive(pathname, status)}
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
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center justify-between gap-2 px-2 group-data-[collapsible=icon]:hidden">
          <ThemeToggle className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" />
          <AccountSwitcher />
        </div>

        <Separator className="my-1 group-data-[collapsible=icon]:hidden" />

        <div className="flex flex-col gap-0.5 rounded-md px-2 py-1.5 group-data-[collapsible=icon]:hidden">
          <p className="truncate text-sm font-medium text-foreground">
            {currentUser
              ? `${currentUser.firstName} ${currentUser.lastName}`
              : 'Cargando...'}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            RFC: {currentUser?.rfc ?? '—'}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {activeAccount
              ? (ACCOUNT_TYPE_LABELS[activeAccount.accountType] ??
                activeAccount.accountType)
              : '—'}
          </p>
        </div>

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

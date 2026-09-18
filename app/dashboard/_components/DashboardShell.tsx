'use client';

import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import AppSidebar from '../../_components/AppSidebar';
import { DocumentsCountProvider } from '../../_components/DocumentsCountContext';
import AuthProvider from './AuthProvider';
import DashboardBreadcrumbs from './DashboardBreadcrumbs';
import OrganizationPlanGuard from './OrganizationPlanGuard';

/**
 * La parte cliente del dashboard: barra lateral, migas y guarda de plan.
 *
 * Se separó del layout cuando éste pasó a ser un Server Component: el layout necesita ser
 * asíncrono para leer la cookie de cuenta activa y pedir los permisos antes de renderizar, y un
 * componente con `'use client'` no puede serlo. Todo lo que había aquí dentro sigue igual; lo
 * único que cambió es quién lo envuelve.
 */
export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DocumentsCountProvider>
      <AuthProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <header className="flex h-12 items-center border-b border-border px-4 md:hidden">
              <SidebarTrigger />
            </header>
            <DashboardBreadcrumbs />
            <OrganizationPlanGuard>{children}</OrganizationPlanGuard>
          </SidebarInset>
        </SidebarProvider>
      </AuthProvider>
    </DocumentsCountProvider>
  );
}

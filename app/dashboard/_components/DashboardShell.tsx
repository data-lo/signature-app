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
          {/*
            La barra lateral es `fixed` (ver `Sidebar`): no se mueve al desplazar en vertical, y el
            `sidebar-gap` reserva su ancho para que el contenido no quede debajo de ella.

            `min-w-0` es lo que la mantiene así también en horizontal. El inset es un hijo flex y,
            sin él, su ancho mínimo es el de su contenido más ancho: una tabla con `minWidth` lo
            estiraba más allá de la ventana, la página entera se desplazaba de lado y el contenido
            pasaba por debajo de la barra. Con él, el desborde se queda en el contenedor de la
            tabla, que es lo único que se desplaza.
          */}
          <SidebarInset className="min-w-0">
            {/* En móvil la barra es un panel que se abre desde este botón: el encabezado queda
              pegado arriba para que el menú siga a mano en cualquier punto de la página. */}
            <header className="sticky top-0 z-20 flex h-12 items-center border-b border-border bg-background px-4 md:hidden">
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

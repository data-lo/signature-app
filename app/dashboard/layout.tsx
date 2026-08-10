'use client';

import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import AppSidebar from '../_components/AppSidebar';
import { DocumentsCountProvider } from '../_components/DocumentsCountContext';
import AuthProvider from './_components/AuthProvider';
import DashboardBreadcrumbs from './_components/DashboardBreadcrumbs';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <DocumentsCountProvider>
      <AuthProvider>
        <SidebarProvider>
          {/* AppSidebar necesitaba `<Suspense>` mientras resaltaba Por firmar/Completados con
              useSearchParams() (?status=): sin él, Next.js fallaba al prerenderizar CUALQUIER
              página bajo este layout. Ahora cada sección tiene su propia ruta y el estado activo
              sale solo de usePathname(), así que el boundary ya no hace falta. */}
          <AppSidebar />
          <SidebarInset>
            <header className="flex h-12 items-center border-b border-border px-4 md:hidden">
              <SidebarTrigger />
            </header>
            <DashboardBreadcrumbs />
            {children}
          </SidebarInset>
        </SidebarProvider>
      </AuthProvider>
    </DocumentsCountProvider>
  );
}

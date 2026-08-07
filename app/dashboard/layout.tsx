'use client';

import { Suspense } from 'react';
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
          {/* AppSidebar usa useSearchParams() (resalta Pendientes/Firmados por ?status=) — sin
              este Suspense, Next.js falla al prerenderizar CUALQUIER página bajo este layout en
              build (el error aparece atribuido a una página distinta según el orden de build). */}
          <Suspense fallback={null}>
            <AppSidebar />
          </Suspense>
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

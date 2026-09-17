'use client';

import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import AppSidebar from '../_components/AppSidebar';
import { DocumentsCountProvider } from '../_components/DocumentsCountContext';
import AuthProvider from './_components/AuthProvider';
import DashboardBreadcrumbs from './_components/DashboardBreadcrumbs';
import OrganizationPlanGuard from './_components/OrganizationPlanGuard';

export default function AppLayout({ children }: { children: React.ReactNode }) {
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

'use client';

import DashboardNavbar from '../_components/DashboardNavbar';
import {
  DocumentsCountProvider,
  useDocumentsCount,
} from '../_components/DocumentsCountContext';

function AppNavbar() {
  const { documentsCount } = useDocumentsCount();
  return <DashboardNavbar documentsCount={documentsCount ?? undefined} />;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <DocumentsCountProvider>
      <div className="min-h-screen bg-muted">
        <AppNavbar />
        {children}
      </div>
    </DocumentsCountProvider>
  );
}

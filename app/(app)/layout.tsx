'use client';

import DashboardNavbar from '../_components/DashboardNavbar';
import {
  DocumentsCountProvider,
  useDocumentsCount,
} from '../_components/DocumentsCountContext';
import OnboardingProvider from './_components/OnboardingProvider';

function AppNavbar() {
  const { documentsCount } = useDocumentsCount();
  return <DashboardNavbar documentsCount={documentsCount ?? undefined} />;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <DocumentsCountProvider>
      <OnboardingProvider>
        <div className="min-h-screen bg-muted">
          <AppNavbar />
          {children}
        </div>
      </OnboardingProvider>
    </DocumentsCountProvider>
  );
}

'use client';

import DashboardNavbar from '../_components/DashboardNavbar';
import {
  DocumentsCountProvider,
  useDocumentsCount,
} from '../_components/DocumentsCountContext';
import OnboardingProvider from './_components/OnboardingProvider';
import AccountProvider from './_components/AccountProvider';

function AppNavbar() {
  const { documentsCount } = useDocumentsCount();
  return <DashboardNavbar documentsCount={documentsCount ?? undefined} />;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <DocumentsCountProvider>
      <OnboardingProvider>
        <AccountProvider>
          <div className="min-h-screen bg-muted">
            <AppNavbar />
            {children}
          </div>
        </AccountProvider>
      </OnboardingProvider>
    </DocumentsCountProvider>
  );
}

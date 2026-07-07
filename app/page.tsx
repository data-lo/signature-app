import { Info } from 'lucide-react';
import DashboardNavbar from './_components/DashboardNavbar';
import DocumentUploadZone from './_components/DocumentUploadZone';
import DocumentsFilterSidebar from './_components/DocumentsFilterSidebar';
import DocumentsTable from './_components/DocumentsTable';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-100">
      <DashboardNavbar />

      <main className="mx-auto max-w-7xl px-8 py-8">
        <DocumentUploadZone />

        <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-4">
          <span className="flex items-center gap-1 text-xs font-semibold tracking-wide text-gray-500">
            FILTROS RÁPIDOS
            <Info className="size-3.5" />
          </span>
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-amber-400" />
              En progreso
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500" />
              Firmado por todos
            </span>
          </div>
        </div>

        <div className="mt-6 flex gap-8">
          <DocumentsFilterSidebar />
          <DocumentsTable />
        </div>
      </main>
    </div>
  );
}

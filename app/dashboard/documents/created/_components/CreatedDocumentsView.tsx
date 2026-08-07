'use client';

import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import DocumentsTable from '../../_components/DocumentsTable';
import { useDocuments } from '../../_hooks/useDocuments';
import { useDocumentsListState } from '../../_hooks/useDocumentsListState';

export default function CreatedDocumentsView() {
  const router = useRouter();
  const { page, setPage, filters, handleFiltersChange } =
    useDocumentsListState();

  const { data: currentUser } = useCurrentUser();
  const { data: myDocuments } = useDocuments({
    scope: 'creator',
    email: currentUser?.email,
    page,
    limit: 10,
    filters,
  });

  return (
    <main className="mx-auto max-w-7xl px-8 py-8">
      <h1 className="mb-4 text-lg font-semibold text-foreground">
        Documentos creados
      </h1>

      <DocumentsTable
        documents={myDocuments?.documents ?? []}
        page={myDocuments?.meta.page}
        totalPages={myDocuments?.meta.totalPages}
        hasNextPage={myDocuments?.meta.hasNextPage}
        hasPrevPage={myDocuments?.meta.hasPrevPage}
        onPageChange={setPage}
        onViewDetail={(id) => router.push(`/dashboard/documents/${id}`)}
        filters={filters}
        onFiltersChange={handleFiltersChange}
      />
    </main>
  );
}

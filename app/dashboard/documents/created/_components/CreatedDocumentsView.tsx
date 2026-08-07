'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import PageContainer from '@/app/dashboard/_components/PageContainer';
import DocumentsTable from '../../_components/DocumentsTable';
import {
  EMPTY_DOCUMENTS_FILTERS,
  type DocumentsFilters,
} from '../../_components/DocumentsFilterPanel';
import { useMyDocuments } from '../../create/_hooks/useMyDocuments';

export default function CreatedDocumentsView() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<DocumentsFilters>(
    EMPTY_DOCUMENTS_FILTERS,
  );

  const { data: currentUser } = useCurrentUser();
  const { data: myDocuments } = useMyDocuments(
    currentUser?.email,
    page,
    filters,
  );

  function handleFiltersChange(nextFilters: DocumentsFilters) {
    setFilters(nextFilters);
    setPage(1);
  }

  return (
    <PageContainer>
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
    </PageContainer>
  );
}

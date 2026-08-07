'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import DocumentsTable from './DocumentsTable';
import {
  EMPTY_DOCUMENTS_FILTERS,
  type DocumentsFilters,
} from './DocumentsFilterPanel';
import { useParticipantDocuments } from '../_hooks/useParticipantDocuments';
import { ParticipantStatus } from '@/lib/enums/document';

type Tab = ParticipantStatus.Pending | ParticipantStatus.Signed;

export default function DocumentsListView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // La sección activa vive en la URL (?status=), fijada por el link del Sidebar
  // correspondiente ("Por firmar" / "Completados") — ya no hay navegación por tabs aquí.
  const tab: Tab =
    searchParams.get('status') === ParticipantStatus.Signed
      ? ParticipantStatus.Signed
      : ParticipantStatus.Pending;
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<DocumentsFilters>(
    EMPTY_DOCUMENTS_FILTERS,
  );

  const { data: currentUser } = useCurrentUser();
  const { data: documentsResult } = useParticipantDocuments(
    currentUser?.email,
    tab,
    page,
    filters,
  );

  function handleFiltersChange(nextFilters: DocumentsFilters) {
    setFilters(nextFilters);
    setPage(1);
  }

  return (
    <main className="mx-auto max-w-7xl px-8 py-8">
      <h1 className="mb-4 text-lg font-semibold text-foreground">
        {tab === ParticipantStatus.Pending
          ? 'Tus documentos pendientes'
          : 'Tus documentos firmados'}
      </h1>

      <DocumentsTable
        documents={documentsResult?.documents ?? []}
        page={documentsResult?.meta.page}
        totalPages={documentsResult?.meta.totalPages}
        hasNextPage={documentsResult?.meta.hasNextPage}
        hasPrevPage={documentsResult?.meta.hasPrevPage}
        onPageChange={setPage}
        onSignClick={
          tab === ParticipantStatus.Pending
            ? (id) => router.push(`/dashboard/documents/${id}`)
            : undefined
        }
        onViewDetail={(id) => router.push(`/dashboard/documents/${id}`)}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        showMyTurnFilter
        showStatusFilter={false}
      />
    </main>
  );
}

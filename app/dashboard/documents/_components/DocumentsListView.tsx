'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { cn } from '@/lib/utils';
import PageContainer from '@/app/dashboard/_components/PageContainer';
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
  // La pestaña activa vive en la URL (?status=) para que el Sidebar pueda resaltar
  // "Documentos pendientes"/"Documentos firmados" según la ruta actual.
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

  function handleTabChange(nextTab: Tab) {
    router.push(`/dashboard/documents?status=${nextTab}`);
    setPage(1);
  }

  function handleFiltersChange(nextFilters: DocumentsFilters) {
    setFilters(nextFilters);
    setPage(1);
  }

  return (
    <PageContainer>
      <div className="mb-6 flex items-center gap-2 border-b border-border">
        <button
          type="button"
          onClick={() => handleTabChange(ParticipantStatus.Pending)}
          className={cn(
            'border-b-2 px-4 py-2 text-sm font-semibold tracking-wide',
            tab === ParticipantStatus.Pending
              ? 'border-emerald-500 text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          PENDIENTES
        </button>
        <button
          type="button"
          onClick={() => handleTabChange(ParticipantStatus.Signed)}
          className={cn(
            'border-b-2 px-4 py-2 text-sm font-semibold tracking-wide',
            tab === ParticipantStatus.Signed
              ? 'border-emerald-500 text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          FIRMADOS
        </button>
      </div>

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
    </PageContainer>
  );
}

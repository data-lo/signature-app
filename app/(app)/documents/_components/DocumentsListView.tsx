'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { cn } from '@/lib/utils';
import DocumentsTable from './DocumentsTable';
import { EMPTY_DOCUMENTS_FILTERS, type DocumentsFilters } from './DocumentsFilterPanel';
import { useParticipantDocuments } from '../_hooks/useParticipantDocuments';

type Tab = 'pending' | 'signed';

export default function DocumentsListView() {
  const [tab, setTab] = useState<Tab>('pending');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<DocumentsFilters>(EMPTY_DOCUMENTS_FILTERS);
  const router = useRouter();

  const { data: currentUser } = useCurrentUser();
  const { data: documentsResult } = useParticipantDocuments(currentUser?.email, tab, page, filters);

  function handleTabChange(nextTab: Tab) {
    setTab(nextTab);
    setPage(1);
  }

  function handleFiltersChange(nextFilters: DocumentsFilters) {
    setFilters(nextFilters);
    setPage(1);
  }

  return (
    <main className="mx-auto max-w-7xl px-8 py-8">
      <div className="mb-6 flex items-center gap-2 border-b border-border">
        <button
          type="button"
          onClick={() => handleTabChange('pending')}
          className={cn(
            'border-b-2 px-4 py-2 text-sm font-semibold tracking-wide',
            tab === 'pending'
              ? 'border-emerald-500 text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          PENDIENTES
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('signed')}
          className={cn(
            'border-b-2 px-4 py-2 text-sm font-semibold tracking-wide',
            tab === 'signed'
              ? 'border-emerald-500 text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          FIRMADOS
        </button>
      </div>

      <h1 className="mb-4 text-lg font-semibold text-foreground">
        {tab === 'pending' ? 'Tus documentos pendientes' : 'Tus documentos firmados'}
      </h1>

      <DocumentsTable
        documents={documentsResult?.documents ?? []}
        page={documentsResult?.meta.page}
        totalPages={documentsResult?.meta.totalPages}
        hasNextPage={documentsResult?.meta.hasNextPage}
        hasPrevPage={documentsResult?.meta.hasPrevPage}
        onPageChange={setPage}
        onSignClick={tab === 'pending' ? (id) => router.push(`/documents/${id}`) : undefined}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        showMyTurnFilter
        showStatusFilter={false}
      />
    </main>
  );
}

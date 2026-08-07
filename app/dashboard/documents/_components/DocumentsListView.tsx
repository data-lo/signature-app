'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import PageContainer from '@/app/dashboard/_components/PageContainer';
import DocumentsTable from './DocumentsTable';
import { useDocuments } from '../_hooks/useDocuments';
import { useDocumentsListState } from '../_hooks/useDocumentsListState';
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
  const { page, setPage, filters, handleFiltersChange } =
    useDocumentsListState();

  const { data: currentUser } = useCurrentUser();
  const { data: documentsResult } = useDocuments({
    scope: 'participant',
    email: currentUser?.email,
    status: tab,
    page,
    limit: 25,
    filters,
  });

  return (
    <PageContainer>
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

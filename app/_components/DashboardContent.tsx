'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import DocumentUploadFlow from './DocumentUploadFlow';
import DocumentsTable from '../(app)/documents/_components/DocumentsTable';
import {
  EMPTY_DOCUMENTS_FILTERS,
  type DocumentsFilters,
} from '../(app)/documents/_components/DocumentsFilterPanel';
import DocumentPreparationView from './DocumentPreparationView';
import { useDocumentsCount } from './DocumentsCountContext';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useMyDocuments } from '../(app)/documents/create/_hooks/useMyDocuments';

interface PreparingDocument {
  name: string;
  file: File;
  willSign: boolean;
}

export default function DashboardContent() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<DocumentsFilters>(
    EMPTY_DOCUMENTS_FILTERS,
  );
  const [preparingDocument, setPreparingDocument] =
    useState<PreparingDocument | null>(null);
  const { setDocumentsCount } = useDocumentsCount();
  const queryClient = useQueryClient();

  const { data: currentUser } = useCurrentUser();
  const { data: documentsResult } = useMyDocuments(
    currentUser?.email,
    page,
    filters,
  );

  useEffect(() => {
    if (documentsResult) setDocumentsCount(documentsResult.meta.total);
  }, [documentsResult, setDocumentsCount]);

  function handleFiltersChange(nextFilters: DocumentsFilters) {
    setFilters(nextFilters);
    setPage(1);
  }

  function handleRequestSignatures() {
    queryClient.invalidateQueries({ queryKey: ['myDocuments'] });
  }

  if (preparingDocument) {
    return (
      <DocumentPreparationView
        file={preparingDocument.file}
        documentName={preparingDocument.name}
        onCancel={() => setPreparingDocument(null)}
        onRequestSignatures={handleRequestSignatures}
      />
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-8 py-8">
      <DocumentUploadFlow onContinueToPreparation={setPreparingDocument} />

      <div className="mt-8 flex items-center justify-end gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-amber-400" />
          En progreso
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-emerald-500" />
          Firmado por todos
        </span>
      </div>

      <div className="mt-6">
        <DocumentsTable
          documents={documentsResult?.documents ?? []}
          page={documentsResult?.meta.page}
          totalPages={documentsResult?.meta.totalPages}
          hasNextPage={documentsResult?.meta.hasNextPage}
          hasPrevPage={documentsResult?.meta.hasPrevPage}
          onPageChange={setPage}
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />
      </div>
    </main>
  );
}

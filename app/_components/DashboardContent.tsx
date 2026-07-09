'use client';

import { useEffect, useMemo, useState } from 'react';
import DocumentUploadFlow from './DocumentUploadFlow';
import DocumentsTable, {
  type DocumentListItem,
} from '../(app)/documents/_components/DocumentsTable';
import {
  EMPTY_DOCUMENTS_FILTERS,
  type DocumentsFilters,
} from '../(app)/documents/_components/DocumentsFilterPanel';
import DocumentPreparationView, {
  type SignerEntry,
} from './DocumentPreparationView';
import { useDocumentsCount } from './DocumentsCountContext';

const initialDocuments: DocumentListItem[] = [
  {
    id: '1',
    fileName: '18._NOMENCLATURA_EXPEDIENTES_CONTRATACION',
    fileType: 'application/pdf',
    signers: ['isaay.sosa@data-lo.com'],
    spectators: [],
    creator: '—',
    totalPages: 1,
    status: 'signed',
    createdAt: new Date(2026, 6, 4).toISOString(),
  },
];

interface PreparingDocument {
  name: string;
  file: File;
  willSign: boolean;
}

export default function DashboardContent() {
  const [documents, setDocuments] =
    useState<DocumentListItem[]>(initialDocuments);
  const [filters, setFilters] = useState<DocumentsFilters>(
    EMPTY_DOCUMENTS_FILTERS,
  );
  const [preparingDocument, setPreparingDocument] =
    useState<PreparingDocument | null>(null);
  const { setDocumentsCount } = useDocumentsCount();

  useEffect(() => {
    setDocumentsCount(documents.length);
  }, [documents.length, setDocumentsCount]);

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      if (
        filters.fileName &&
        !doc.fileName.toLowerCase().includes(filters.fileName.toLowerCase())
      ) {
        return false;
      }
      if (
        filters.participantName &&
        !doc.signers.some((signer) =>
          signer.toLowerCase().includes(filters.participantName.toLowerCase()),
        )
      ) {
        return false;
      }
      if (filters.status && doc.status !== filters.status) {
        return false;
      }
      const createdAt = new Date(doc.createdAt);
      if (filters.createdFrom && createdAt < new Date(filters.createdFrom)) {
        return false;
      }
      if (filters.createdTo && createdAt > new Date(filters.createdTo)) {
        return false;
      }
      return true;
    });
  }, [documents, filters]);

  function handleRequestSignatures(signers: SignerEntry[]) {
    if (!preparingDocument) return;
    setDocuments((prev) => [
      {
        id: crypto.randomUUID(),
        fileName: preparingDocument.name,
        fileType: preparingDocument.file.type,
        signers: signers.map((entry) => entry.email),
        spectators: [],
        creator: '—',
        totalPages: 1,
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
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
          documents={filteredDocuments}
          filters={filters}
          onFiltersChange={setFilters}
        />
      </div>
    </main>
  );
}

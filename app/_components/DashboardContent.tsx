'use client';

import { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import DocumentUploadFlow from './DocumentUploadFlow';
import DocumentsFilterSidebar from '../(app)/documents/_components/DocumentsFilterSidebar';
import DocumentsTable, { type DocumentListItem } from '../(app)/documents/_components/DocumentsTable';
import DocumentPreparationView, { type SignerEntry } from './DocumentPreparationView';
import { useDocumentsCount } from './DocumentsCountContext';

const initialDocuments: DocumentListItem[] = [
  {
    id: '1',
    fileName: '18._NOMENCLATURA_EXPEDIENTES_CONTRATACION',
    fileType: 'application/pdf',
    signer: 'isaay.sosa@data-lo.com',
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
  const [documents, setDocuments] = useState<DocumentListItem[]>(initialDocuments);
  const [preparingDocument, setPreparingDocument] = useState<PreparingDocument | null>(null);
  const { setDocumentsCount } = useDocumentsCount();

  useEffect(() => {
    setDocumentsCount(documents.length);
  }, [documents.length, setDocumentsCount]);

  function handleRequestSignatures(signers: SignerEntry[]) {
    if (!preparingDocument) return;
    const signer = signers.map((entry) => entry.email).join(', ') || 'Sin firmante';
    setDocuments((prev) => [
      {
        id: crypto.randomUUID(),
        fileName: preparingDocument.name,
        fileType: preparingDocument.file.type,
        signer,
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
        <DocumentsTable documents={documents} />
      </div>
    </main>
  );
}

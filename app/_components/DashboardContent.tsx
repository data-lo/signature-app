'use client';

import { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import DocumentUploadFlow from './DocumentUploadFlow';
import DocumentsFilterSidebar from './DocumentsFilterSidebar';
import DocumentsTable, { type DashboardDocument } from './DocumentsTable';
import DocumentPreparationView, { type SignerEntry } from './DocumentPreparationView';
import { useDocumentsCount } from './DocumentsCountContext';

const initialDocuments: DashboardDocument[] = [
  {
    id: '1',
    name: '18._NOMENCLATURA_EXPEDIENTES_CONTRATACION',
    file: null,
    participant: 'isaay.sosa@data-lo.com',
    createdAt: new Date(2026, 6, 4),
    signedAt: new Date(2026, 6, 4),
  },
];

interface PreparingDocument {
  name: string;
  file: File;
  willSign: boolean;
}

export default function DashboardContent() {
  const [documents, setDocuments] = useState<DashboardDocument[]>(initialDocuments);
  const [preparingDocument, setPreparingDocument] = useState<PreparingDocument | null>(null);
  const { setDocumentsCount } = useDocumentsCount();

  useEffect(() => {
    setDocumentsCount(documents.length);
  }, [documents.length, setDocumentsCount]);

  function handleRequestSignatures(signers: SignerEntry[]) {
    if (!preparingDocument) return;
    const participant = signers.map((signer) => signer.email).join(', ') || null;
    setDocuments((prev) => [
      {
        id: crypto.randomUUID(),
        name: preparingDocument.name,
        file: preparingDocument.file,
        participant,
        createdAt: new Date(),
        signedAt: null,
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

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import DocumentsFilterSidebar from '../../_components/DocumentsFilterSidebar';
import DocumentsTable from '../../_components/DocumentsTable';
import { selectSignerSchema, type SelectSignerFormValues } from '../_schemas';
import { useMyDocuments } from '../_hooks/useMyDocuments';
import { useSubmitForAuthorization } from '../_hooks/useSubmitForAuthorization';
import SignerSelect from './SignerSelect';
import DocumentUploadCard from './DocumentUploadCard';

export default function CreateDocumentView() {
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const {
    watch,
    setValue,
    formState: { errors },
  } = useForm<SelectSignerFormValues>({
    resolver: zodResolver(selectSignerSchema),
    mode: 'onChange',
  });

  const signerId = watch('signerId') ?? null;

  const { data: currentUser } = useCurrentUser();
  const { data: myDocuments } = useMyDocuments(currentUser?.email, page);
  const submitMutation = useSubmitForAuthorization();

  function handleSignerChange(value: string) {
    setValue('signerId', value, { shouldValidate: true });
    if (documentId) {
      setDocumentId(null);
    }
  }

  function handleSign() {
    if (!documentId) return;
    submitMutation.mutate(documentId);
  }

  return (
    <main className="mx-auto max-w-7xl px-8 py-8">
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h1 className="text-base font-semibold text-gray-900">
          Prepara un documento para solicitar que sea firmado
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          El documento debe estar en formato PDF y pesar menos de 20 MB.
        </p>

        <div className="mt-4 flex flex-col gap-4">
          <SignerSelect
            value={signerId ?? undefined}
            error={errors.signerId?.message}
            onChange={handleSignerChange}
          />

          <DocumentUploadCard
            signerId={signerId}
            onUploadSuccess={setDocumentId}
            onUploadReset={() => setDocumentId(null)}
          />

          <Button
            type="button"
            className="w-full sm:w-auto"
            disabled={!documentId || submitMutation.isPending}
            onClick={handleSign}
          >
            {submitMutation.isPending ? 'Enviando a firma...' : 'Firmar'}
          </Button>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-4">
        <span className="flex items-center gap-1 text-xs font-semibold tracking-wide text-gray-500">
          FILTROS RÁPIDOS
          <Info className="size-3.5" />
        </span>
      </div>

      <div className="mt-6 flex gap-8">
        <DocumentsFilterSidebar />
        <DocumentsTable
          documents={myDocuments?.documents ?? []}
          page={myDocuments?.meta.page}
          totalPages={myDocuments?.meta.totalPages}
          hasNextPage={myDocuments?.meta.hasNextPage}
          hasPrevPage={myDocuments?.meta.hasPrevPage}
          onPageChange={setPage}
        />
      </div>
    </main>
  );
}

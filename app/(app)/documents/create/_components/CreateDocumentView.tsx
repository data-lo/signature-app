'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useDocumentsCount } from '@/app/_components/DocumentsCountContext';
import DocumentsTable from '../../_components/DocumentsTable';
import {
  EMPTY_DOCUMENTS_FILTERS,
  type DocumentsFilters,
} from '../../_components/DocumentsFilterPanel';
import ParticipantPicker from '../../_components/ParticipantPicker';
import { useUsers } from '../../_hooks/useUsers';
import {
  selectParticipantsSchema,
  type SelectParticipantsFormValues,
} from '../_schemas';
import { useMyDocuments } from '../_hooks/useMyDocuments';
import {
  useCreateDocument,
  getCreateDocumentErrorMessage,
} from '../_hooks/useCreateDocument';
import DocumentFilePicker from './DocumentFilePicker';

const PdfPreview = dynamic(() => import('../../_components/PdfPreview'), {
  ssr: false,
});

export default function CreateDocumentView() {
  const [file, setFile] = useState<File | null>(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<DocumentsFilters>(
    EMPTY_DOCUMENTS_FILTERS,
  );

  const {
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<SelectParticipantsFormValues>({
    resolver: zodResolver(selectParticipantsSchema),
    mode: 'onChange',
    defaultValues: { signerIds: [], spectatorIds: [] },
  });

  const signerIds = watch('signerIds');
  const spectatorIds = watch('spectatorIds');

  const { data: users } = useUsers();
  const { data: currentUser } = useCurrentUser();
  const { data: myDocuments } = useMyDocuments(
    currentUser?.email,
    page,
    filters,
  );
  const createMutation = useCreateDocument();
  const { setDocumentsCount } = useDocumentsCount();

  useEffect(() => {
    if (myDocuments) setDocumentsCount(myDocuments.meta.total);
  }, [myDocuments, setDocumentsCount]);

  function onSubmit(values: SelectParticipantsFormValues) {
    if (!file) return;
    createMutation.mutate({
      file,
      signerIds: values.signerIds,
      spectatorIds: values.spectatorIds,
    });
  }

  function handleFiltersChange(nextFilters: DocumentsFilters) {
    setFilters(nextFilters);
    setPage(1);
  }

  return (
    <main className="mx-auto max-w-7xl px-8 py-8">
      <div className="rounded-lg border border-border bg-card p-6">
        <h1 className="text-base font-semibold text-foreground">
          Prepara un documento para solicitar que sea firmado
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          El documento debe estar en formato PDF y pesar menos de 20 MB.
        </p>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2"
        >
          <div className="flex flex-col gap-4">
            <DocumentFilePicker onFileSelected={setFile} />

            <ParticipantPicker
              label="Firmantes"
              placeholder="Agregar firmante"
              users={(users ?? []).filter(
                (user) => !spectatorIds.includes(user.id),
              )}
              selectedIds={signerIds}
              onChange={(ids) =>
                setValue('signerIds', ids, { shouldValidate: true })
              }
              showOrder
              error={errors.signerIds?.message}
            />

            <ParticipantPicker
              label="Espectadores"
              placeholder="Agregar espectador"
              users={(users ?? []).filter(
                (user) => !signerIds.includes(user.id),
              )}
              selectedIds={spectatorIds}
              onChange={(ids) =>
                setValue('spectatorIds', ids, { shouldValidate: true })
              }
              error={errors.spectatorIds?.message}
            />

            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={
                !file || signerIds.length === 0 || createMutation.isPending
              }
            >
              {createMutation.isPending ? 'Enviando a firma...' : 'Firmar'}
            </Button>

            {createMutation.isError && (
              <p className="text-sm text-destructive">
                {getCreateDocumentErrorMessage(createMutation.error)}
              </p>
            )}
          </div>

          <Card className="h-[520px] overflow-hidden p-0">
            <CardContent className="h-full p-0">
              {file ? (
                <PdfPreview file={file} />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  La previsualización del documento aparecerá aquí
                </div>
              )}
            </CardContent>
          </Card>
        </form>
      </div>

      <div className="mt-8 border-t border-border pt-6">
        <DocumentsTable
          documents={myDocuments?.documents ?? []}
          page={myDocuments?.meta.page}
          totalPages={myDocuments?.meta.totalPages}
          hasNextPage={myDocuments?.meta.hasNextPage}
          hasPrevPage={myDocuments?.meta.hasPrevPage}
          onPageChange={setPage}
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />
      </div>
    </main>
  );
}

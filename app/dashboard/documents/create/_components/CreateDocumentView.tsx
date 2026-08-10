'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import PageContainer from '@/app/dashboard/_components/PageContainer';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useDocumentsCount } from '@/app/_components/DocumentsCountContext';
import { getErrorMessage } from '@/lib/error-handler';
import DocumentsTable from '../../_components/DocumentsTable';
import {
  createDocumentSignaturesSchema,
  type CreateDocumentSignaturesFormValues,
  type SignerFormValues,
} from '../_schemas';
import { useDocuments } from '../../_hooks/useDocuments';
import { useDocumentsListState } from '../../_hooks/useDocumentsListState';
import { DOCUMENTS_LIST_CONFIG } from '../../_config/sections';
import { useCreateDocumentSignatures } from '../_hooks/useCreateDocumentSignatures';
import DocumentFilePicker from './DocumentFilePicker';
import CollaboratorsFieldArray from './CollaboratorsFieldArray';
import RequiresApprovalField from './RequiresApprovalField';
import RequiresOrderField from './RequiresOrderField';
import IncludeMeAsSignerField from './IncludeMeAsSignerField';

// react-pdf necesita el DOM (canvas) — igual que PdfPreview, se carga solo en cliente.
const SignaturePlacementField = dynamic(
  () => import('./SignaturePlacementField'),
  { ssr: false },
);

const DEFAULT_VALUES: CreateDocumentSignaturesFormValues = {
  requiresApproval: false,
  includeMeAsSigner: false,
  requiresOrder: false,
  collaborators: [],
};

interface CreateDocumentViewProps {
  /**
   * Bug corregido: cuando se renderiza dentro de la sección "visible pero deshabilitada" de
   * HomeContent (onboarding incompleto), este componente igual se monta y hace fetch (para
   * mostrar contenido real, no un placeholder vacío) — pero sin esto, ese fetch también
   * publicaba el conteo en DocumentsCountContext, lo que hacía aparecer el badge "DOCUMENTOS:N"
   * clickeable en DashboardNavbar (fuera del wrapper `inert`) para un usuario que la home
   * todavía está bloqueando. `false` solo suprime esa publicación al contexto global; la
   * consulta y la tabla dentro de esta vista siguen funcionando igual.
   */
  trackDocumentsCount?: boolean;
  /** Cuando es `false`, oculta la tabla de "myDocuments" bajo el formulario (ver /documents/create, que la extrae a su propia sección "Documentos creados" del Sidebar). */
  showCreatedDocuments?: boolean;
}

export default function CreateDocumentView({
  trackDocumentsCount = true,
  showCreatedDocuments = true,
}: CreateDocumentViewProps = {}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [filePondKey, setFilePondKey] = useState(0);
  const { page, setPage, filters, handleFiltersChange } =
    useDocumentsListState();

  const {
    control,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<CreateDocumentSignaturesFormValues>({
    resolver: zodResolver(createDocumentSignaturesSchema),
    mode: 'onChange',
    defaultValues: DEFAULT_VALUES,
  });

  const collaboratorsWatch = useWatch({ control, name: 'collaborators' });
  const signerCount = collaboratorsWatch.filter(
    (collaborator) => collaborator.collaboratorType === 'SIGNER',
  ).length;

  const { data: currentUser } = useCurrentUser();
  // Mismo listado que la sección "Enviados para firma": documentos creados por el usuario.
  const { data: myDocuments } = useDocuments({
    type: 'sent',
    page,
    limit: DOCUMENTS_LIST_CONFIG.sent.limit,
    filters,
  });
  const createMutation = useCreateDocumentSignatures();
  const { setDocumentsCount } = useDocumentsCount();

  useEffect(() => {
    if (myDocuments && trackDocumentsCount) {
      setDocumentsCount(myDocuments.meta.total);
    }
  }, [myDocuments, trackDocumentsCount, setDocumentsCount]);

  function onSubmit(values: CreateDocumentSignaturesFormValues) {
    if (!file) return;

    const collaborators = [...values.collaborators];
    if (values.includeMeAsSigner && currentUser) {
      const self: SignerFormValues = {
        collaboratorType: 'SIGNER',
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        email: currentUser.email,
        signatureType: 'SIMPLE',
        rfc: currentUser.rfc,
        requiresTwoFactorAuth: true,
        // Este colaborador se agrega solo aquí, al enviar — nunca pasa por el arreglo de RHF que
        // alimenta el panel de ubicación de firmas (ver SignaturePlacementField), así que no hay
        // forma de que tenga una posición colocada.
        signatures: [],
      };
      collaborators.push(self);
    }

    createMutation.mutate(
      {
        file,
        fileName: file.name,
        requiresApproval: values.requiresApproval,
        requiresOrder: values.requiresOrder,
        collaborators,
      },
      {
        onSuccess: () => {
          // Escenario 4: limpia el formulario y el componente FilePond tras un envío exitoso.
          reset(DEFAULT_VALUES);
          setFile(null);
          setFilePondKey((key) => key + 1);
        },
      },
    );
  }

  return (
    <PageContainer>
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
            <DocumentFilePicker
              key={filePondKey}
              onFileSelected={setFile}
              onLoadingChange={setIsFileLoading}
            />

            <RequiresApprovalField control={control} />

            <RequiresOrderField control={control} signerCount={signerCount} />

            <CollaboratorsFieldArray control={control} errors={errors} />

            <IncludeMeAsSignerField control={control} />

            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={!file || createMutation.isPending}
            >
              {createMutation.isPending ? 'Enviando a firma...' : 'Firmar'}
            </Button>

            {createMutation.isError && (
              <p className="text-sm text-destructive">
                {getErrorMessage(
                  createMutation.error,
                  'Ocurrió un error al enviar el documento a firma. Intenta de nuevo.',
                )}
              </p>
            )}
          </div>

          <Card className="h-[640px] overflow-hidden p-0">
            <CardContent className="h-full p-0">
              {isFileLoading ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Cargando documento...
                </div>
              ) : file ? (
                <SignaturePlacementField
                  file={file}
                  control={control}
                  getValues={getValues}
                  setValue={setValue}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  La previsualización del documento aparecerá aquí
                </div>
              )}
            </CardContent>
          </Card>
        </form>
      </div>

      {showCreatedDocuments && (
        <div className="mt-8 border-t border-border pt-6">
          <DocumentsTable
            documents={myDocuments?.documents ?? []}
            page={myDocuments?.meta.page}
            totalPages={myDocuments?.meta.totalPages}
            hasNextPage={myDocuments?.meta.hasNextPage}
            hasPrevPage={myDocuments?.meta.hasPrevPage}
            onPageChange={setPage}
            onViewDetail={(id) => router.push(`/dashboard/documents/${id}`)}
            filters={filters}
            onFiltersChange={handleFiltersChange}
          />
        </div>
      )}
    </PageContainer>
  );
}

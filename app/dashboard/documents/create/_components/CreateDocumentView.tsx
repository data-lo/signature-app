'use client';

import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field';
import PageContainer from '@/app/dashboard/_components/PageContainer';
import { buildCreateDocumentSections } from '../_section-rules';
import { useDocumentFileSelection } from '../_hooks/useDocumentFileSelection';
import { useCreateDocumentForm } from '../_hooks/useCreateDocumentForm';
import { useCreatedDocuments } from '../_hooks/useCreatedDocuments';
import DocumentUploadSection from './DocumentUploadSection';
import DocumentConfigurationSection from './DocumentConfigurationSection';
import DocumentParticipantsSection from './DocumentParticipantsSection';
import DocumentSignaturePlacementSection from './DocumentSignaturePlacementSection';
import CreatedDocumentsSection from './CreatedDocumentsSection';
import { Form } from '@/components/form/form';

interface CreateDocumentViewProps {
  /**
   * Bug corregido: cuando se renderiza dentro de la sección "visible pero deshabilitada" de
   * CreateDocumentGuard (onboarding incompleto), este componente igual se monta y hace fetch
   * (para mostrar contenido real, no un placeholder vacío) — pero sin esto, ese fetch también
   * publicaba el conteo en DocumentsCountContext, lo que hacía aparecer el badge "DOCUMENTOS:N"
   * clickeable en la navegación (fuera del wrapper `inert`) para un usuario que la pantalla
   * todavía está bloqueando. `false` solo suprime esa publicación al contexto global; la
   * consulta y la tabla dentro de esta vista siguen funcionando igual.
   */
  trackDocumentsCount?: boolean;
  /** Cuando es `false`, oculta la tabla de documentos creados bajo el formulario: esa lista ya
   * tiene su propia entrada en el Sidebar ("Enviados para firma", `/dashboard/documents/sent`). */
  showCreatedDocuments?: boolean;
}

/**
 * Pantalla de carga y configuración de un documento para enviarlo a firma. Su responsabilidad es
 * componer las secciones y repartirles el estado que produce cada hook especializado: la carga
 * del archivo (`useDocumentFileSelection`), el formulario y su envío (`useCreateDocumentForm`),
 * el listado de documentos creados (`useCreatedDocuments`) y las reglas de activación de cada
 * sección (`buildCreateDocumentSections`).
 */
export default function CreateDocumentView({
  trackDocumentsCount = true,
  showCreatedDocuments = true,
}: CreateDocumentViewProps = {}) {
  const fileSelection = useDocumentFileSelection();
  const createDocumentForm = useCreateDocumentForm({
    file: fileSelection.file,
    onSubmitted: fileSelection.clear,
  });
  const createdDocuments = useCreatedDocuments({ trackDocumentsCount });

  const sections = buildCreateDocumentSections({
    hasFile: fileSelection.file !== null,
    isFileLoading: fileSelection.isLoading,
    participantsErrorMessage: createDocumentForm.participantsErrorMessage,
    isSubmitting: createDocumentForm.createDocumentSignaturesMutation.isPending,
    submitErrorMessage: createDocumentForm.submitErrorMessage,
    showCreatedDocuments,
    isLoadingCreatedDocuments: createdDocuments.createdDocumentsQuery.isLoading,
    createdDocumentsErrorMessage: createdDocuments.errorMessage,
  });

  return (
    <PageContainer>
      <div className="rounded-lg border border-border bg-card p-6">
        <h1 className="text-base font-semibold text-foreground">
          Prepara un documento para solicitar que sea firmado
        </h1>

        <Form
          onSubmit={createDocumentForm.handleSubmit}
          className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2"
        >
          <div className="flex flex-col gap-4">
            <DocumentUploadSection
              state={sections.upload}
              file={fileSelection.file}
              onFileSelected={fileSelection.select}
              onLoadingChange={fileSelection.setLoading}
            />

            <DocumentConfigurationSection
              state={sections.configuration}
              control={createDocumentForm.form.control}
              signerCount={createDocumentForm.signerCount}
            />

            <DocumentParticipantsSection
              state={sections.participants}
              control={createDocumentForm.form.control}
            />

            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={!sections.submission.isEnabled}
            >
              {sections.submission.isLoading ? 'Enviando a firma...' : 'Firmar'}
            </Button>

            {sections.submission.hasError && (
              <FieldError>{sections.submission.errorMessage}</FieldError>
            )}
          </div>

          <DocumentSignaturePlacementSection
            state={sections.signaturePlacement}
            file={fileSelection.file}
            control={createDocumentForm.form.control}
            getValues={createDocumentForm.form.getValues}
            setValue={createDocumentForm.form.setValue}
          />
        </Form>
      </div>

      <CreatedDocumentsSection
        state={sections.createdDocuments}
        documents={createdDocuments.createdDocumentsQuery.data}
        filters={createdDocuments.filters}
        onFiltersChange={createdDocuments.handleFiltersChange}
        onPageChange={createdDocuments.setPage}
      />
    </PageContainer>
  );
}

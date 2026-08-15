'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field';
import { Accordion } from '@/components/ui/accordion';
import PageContainer from '@/app/dashboard/_components/PageContainer';
import { buildCreateDocumentSections } from '../_section-rules';
import { buildCreateDocumentProgress } from '../_section-progress';
import { useDocumentFileSelection } from '../_hooks/useDocumentFileSelection';
import { useCreateDocumentForm } from '../_hooks/useCreateDocumentForm';
import { useCreatedDocuments } from '../_hooks/useCreatedDocuments';
import DocumentSectionAccordionItem from './DocumentSectionAccordionItem';
import DocumentUploadSection from './DocumentUploadSection';
import DocumentConfigurationSection from './DocumentConfigurationSection';
import DocumentParticipantsSection from './DocumentParticipantsSection';
import DocumentSignaturePlacementSection from './DocumentSignaturePlacementSection';
import DocumentRequestSummary from './DocumentRequestSummary';
import CreatedDocumentsSection from './CreatedDocumentsSection';
import DocumentSentDialog from './DocumentSentDialog';
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

/** Los tres acordeones de la solicitud, en el orden en que se presentan. */
const UPLOAD_SECTION = 'upload';
const CONFIGURATION_SECTION = 'configuration';
const PARTICIPANTS_SECTION = 'participants';

/**
 * Arrancan los tres abiertos: el formulario completo se ve de un vistazo y ninguna sección
 * espera a que otra se complete para poder editarse. El usuario contrae las que ya resolvió.
 */
const ALL_SECTIONS = [
  UPLOAD_SECTION,
  CONFIGURATION_SECTION,
  PARTICIPANTS_SECTION,
];

/**
 * Pantalla de carga y configuración de un documento para enviarlo a firma. Su responsabilidad es
 * componer las secciones y repartirles el estado que produce cada hook especializado: la carga
 * del archivo (`useDocumentFileSelection`), el formulario y su envío (`useCreateDocumentForm`),
 * el listado de documentos creados (`useCreatedDocuments`), las reglas de activación de cada
 * sección (`buildCreateDocumentSections`) y cuánto lleva configurado la solicitud
 * (`buildCreateDocumentProgress`).
 *
 * Las tres secciones viven en acordeones independientes: se abren y editan en cualquier momento y
 * en cualquier orden — ninguna se bloquea por el estado de las demás. Lo único que depende de
 * todas es el botón "Firmar", que se habilita cuando ya no falta nada. El resumen y ese botón se
 * muestran de forma fija debajo de los acordeones, así que el usuario ve qué eligió sin tener que
 * volver a abrir una sección.
 */
export default function CreateDocumentView({
  trackDocumentsCount = true,
  showCreatedDocuments = true,
}: CreateDocumentViewProps = {}) {
  const [isSentDialogOpen, setIsSentDialogOpen] = useState(false);
  const [openSections, setOpenSections] = useState<string[]>(ALL_SECTIONS);
  const fileSelection = useDocumentFileSelection();
  const createDocumentForm = useCreateDocumentForm({
    file: fileSelection.file,
    // `onSubmitted` ya significa "el envío salió bien" (limpia el archivo cargado), así que es
    // el punto natural para abrir la confirmación sin cambiar el contrato de los hooks.
    onSubmitted: () => {
      fileSelection.clear();
      setIsSentDialogOpen(true);
    },
  });
  const createdDocuments = useCreatedDocuments({ trackDocumentsCount });

  const progress = buildCreateDocumentProgress({
    hasFile: fileSelection.file !== null,
    isFileLoading: fileSelection.isLoading,
    fileName: fileSelection.file?.name,
    pageCount: fileSelection.pageCount,
    signatureType: createDocumentForm.signatureType,
    signerCount: createDocumentForm.signerCount,
    viewerCount: createDocumentForm.viewerCount,
  });

  const sections = buildCreateDocumentSections({
    hasFile: fileSelection.file !== null,
    isFileLoading: fileSelection.isLoading,
    participantsErrorMessage: createDocumentForm.participantsErrorMessage,
    isReadyToSubmit: progress.isReadyToSubmit,
    isSubmitting: createDocumentForm.createDocumentSignaturesMutation.isPending,
    submitErrorMessage: createDocumentForm.submitErrorMessage,
    showCreatedDocuments,
    isLoadingCreatedDocuments: createdDocuments.createdDocumentsQuery.isLoading,
    createdDocumentsErrorMessage: createdDocuments.errorMessage,
  });

  const isOpen = (section: string) => openSections.includes(section);

  return (
    <PageContainer>
      <h1 className="text-base font-semibold text-foreground">
        Prepara un documento para solicitar que sea firmado
      </h1>

      <Form
        onSubmit={createDocumentForm.handleSubmit}
        className="mt-4 grid grid-cols-1 items-start gap-6 lg:grid-cols-2"
      >
        <div className="flex flex-col gap-4">
          <Accordion
            value={openSections}
            onValueChange={(value) => setOpenSections(value as string[])}
          >
            <DocumentSectionAccordionItem
              value={UPLOAD_SECTION}
              step={1}
              title="Cargar documento"
              isComplete={progress.upload.isComplete}
              collapsedSummary={progress.upload.collapsedSummary}
              isOpen={isOpen(UPLOAD_SECTION)}
            >
              <DocumentUploadSection
                state={sections.upload}
                file={fileSelection.file}
                onFileSelected={fileSelection.select}
                onLoadingChange={fileSelection.setLoading}
              />
            </DocumentSectionAccordionItem>

            <DocumentSectionAccordionItem
              value={CONFIGURATION_SECTION}
              step={2}
              title="Configurar firma"
              isComplete={progress.configuration.isComplete}
              collapsedSummary={progress.configuration.collapsedSummary}
              isOpen={isOpen(CONFIGURATION_SECTION)}
            >
              <DocumentConfigurationSection
                state={sections.configuration}
                control={createDocumentForm.form.control}
                signerCount={createDocumentForm.signerCount}
              />
            </DocumentSectionAccordionItem>

            <DocumentSectionAccordionItem
              value={PARTICIPANTS_SECTION}
              step={3}
              title="Añadir participantes"
              isComplete={progress.participants.isComplete}
              collapsedSummary={progress.participants.collapsedSummary}
              isOpen={isOpen(PARTICIPANTS_SECTION)}
            >
              <DocumentParticipantsSection
                state={sections.participants}
                control={createDocumentForm.form.control}
              />
            </DocumentSectionAccordionItem>
          </Accordion>

          <DocumentRequestSummary summary={progress.summary} />

          <Button
            type="submit"
            className="w-full"
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
          onPageCountChange={fileSelection.setPageCount}
        />
      </Form>

      <CreatedDocumentsSection
        state={sections.createdDocuments}
        documents={createdDocuments.createdDocumentsQuery.data}
        filters={createdDocuments.filters}
        onFiltersChange={createdDocuments.handleFiltersChange}
        onPageChange={createdDocuments.setPage}
      />

      <DocumentSentDialog
        open={isSentDialogOpen}
        onOpenChange={setIsSentDialogOpen}
      />
    </PageContainer>
  );
}

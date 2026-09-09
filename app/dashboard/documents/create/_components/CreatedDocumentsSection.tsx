'use client';

import { useRouter } from 'next/navigation';
import { FormSection } from '@/components/form/form-section';
import type { SectionState } from '../_interfaces/section-state.interface';
import DocumentsTable from '../../_components/DocumentsTable';
import type { DocumentsResult } from '../../_requests';

interface CreatedDocumentsSectionProps {
  state: SectionState;
  documents: DocumentsResult | undefined;
  onPageChange: (page: number) => void;
}

/**
 * Sección con los documentos que el usuario ya envió a firma. Solo se renderiza en las pantallas
 * que la piden (ver `showCreatedDocuments` en `CreateDocumentView`).
 *
 * Sin filtros propios: es un vistazo a lo enviado sin salir de la pantalla de creación, y quien
 * necesite buscar o filtrar tiene el listado de documentos, que es el que hace eso. La misma
 * lista, con el recorte "Creados por mí", vive en `/dashboard/documents?view=created_by_me`.
 */
export default function CreatedDocumentsSection({
  state,
  documents,
  onPageChange,
}: CreatedDocumentsSectionProps) {
  const router = useRouter();

  if (!state.isEnabled) {
    return null;
  }

  return (
    <FormSection
      isLoading={state.isLoading}
      loadingMessage="Cargando tus documentos..."
      hasError={state.hasError}
      errorMessage={state.errorMessage}
      className="mt-8 border-t border-border pt-6"
    >
      <DocumentsTable
        documents={documents?.items ?? []}
        page={documents?.pagination.page}
        totalPages={documents?.pagination.totalPages}
        onPageChange={onPageChange}
        onRowSelect={(id) => router.push(`/dashboard/documents/${id}`)}
      />
    </FormSection>
  );
}

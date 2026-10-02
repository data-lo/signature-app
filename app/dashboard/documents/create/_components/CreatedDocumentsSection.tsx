'use client';

import { useRouter } from 'next/navigation';
import { FormSection } from '@/components/form/form-section';
import type { SectionState } from '../_interfaces/section-state.interface';
import DocumentsTable from '../../_components/DocumentsTable';
import type { DocumentsResult } from '../../_requests';
import type { DocumentsPageSize } from '../../_config/pagination';

interface CreatedDocumentsSectionProps {
  state: SectionState;
  documents: DocumentsResult | undefined;
  /** Página pedida, desde 1; mientras carga puede no coincidir con la de `documents`. */
  page: number;
  /** Documentos por página que se piden al backend. */
  pageSize: DocumentsPageSize;
  /**
   * `documents` es la respuesta de la página anterior, conservada mientras llega la pedida: la
   * tabla muestra la carga en vez de esas filas.
   */
  isChangingPage?: boolean;
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
  page,
  pageSize,
  isChangingPage = false,
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
        documents={isChangingPage ? [] : (documents?.items ?? [])}
        page={page}
        totalPages={documents?.pagination.totalPages ?? 1}
        onPageChange={onPageChange}
        pageSize={pageSize}
        isLoading={isChangingPage}
        onRowSelect={(id) => router.push(`/dashboard/documents/${id}`)}
      />
    </FormSection>
  );
}

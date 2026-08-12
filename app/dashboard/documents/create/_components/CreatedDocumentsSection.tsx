'use client';

import { useRouter } from 'next/navigation';
import { FormSection } from '@/components/form/form-section';
import type { SectionState } from '../_interfaces/section-state.interface';
import DocumentsTable from '../../_components/DocumentsTable';
import type { DocumentsFilters } from '../../_components/DocumentsFilterPanel';
import type { DocumentsResult } from '../../_requests';

interface CreatedDocumentsSectionProps {
  state: SectionState;
  documents: DocumentsResult | undefined;
  filters: DocumentsFilters;
  onFiltersChange: (filters: DocumentsFilters) => void;
  onPageChange: (page: number) => void;
}

/**
 * Sección con los documentos que el usuario ya envió a firma. Solo se renderiza en las pantallas
 * que la piden (ver `showCreatedDocuments` en `CreateDocumentView`): esta lista también vive en
 * su propia ruta, `/dashboard/documents/sent` ("Enviados para firma").
 */
export default function CreatedDocumentsSection({
  state,
  documents,
  filters,
  onFiltersChange,
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
        documents={documents?.documents ?? []}
        page={documents?.meta.page}
        totalPages={documents?.meta.totalPages}
        hasNextPage={documents?.meta.hasNextPage}
        hasPrevPage={documents?.meta.hasPrevPage}
        onPageChange={onPageChange}
        onViewDetail={(id) => router.push(`/dashboard/documents/${id}`)}
        filters={filters}
        onFiltersChange={onFiltersChange}
      />
    </FormSection>
  );
}

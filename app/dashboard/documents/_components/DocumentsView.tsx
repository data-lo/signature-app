'use client';

import { useRouter } from 'next/navigation';
import PageContainer from '@/app/dashboard/_components/PageContainer';
import DocumentsTable from './DocumentsTable';
import { useDocuments } from '../_hooks/useDocuments';
import { useDocumentsListState } from '../_hooks/useDocumentsListState';
import {
  DOCUMENTS_LIST_CONFIG,
  DOCUMENTS_SECTIONS,
  type DocumentsListType,
} from '../_config/sections';

interface DocumentsViewProps {
  /** Sección del módulo: define el scope/status de la consulta y las acciones de la tabla. */
  type: DocumentsListType;
  /** Encabezado de la pantalla; por defecto el mismo nombre que usan sidebar y breadcrumb. */
  title?: string;
}

/**
 * Vista única de listado de documentos: la tabla, los filtros, la paginación y los estados
 * visuales viven aquí y no se duplican por sección. Cada `page.tsx` del módulo solo pasa su
 * `type`; las diferencias salen de DOCUMENTS_LIST_CONFIG.
 */
export default function DocumentsView({ type, title }: DocumentsViewProps) {
  const router = useRouter();
  const { page, setPage, filters, handleFiltersChange } =
    useDocumentsListState();
  const { limit, showMyTurnFilter, showStatusFilter } =
    DOCUMENTS_LIST_CONFIG[type];

  const documentsQuery = useDocuments({
    type,
    page,
    limit,
    filters,
  });
  const documentsResult = documentsQuery.data;

  return (
    <PageContainer>
      <h1 className="mb-4 text-lg font-semibold text-foreground">
        {title ?? DOCUMENTS_SECTIONS[type].label}
      </h1>

      <DocumentsTable
        documents={documentsResult?.documents ?? []}
        page={documentsResult?.meta.page}
        totalPages={documentsResult?.meta.totalPages}
        hasNextPage={documentsResult?.meta.hasNextPage}
        hasPrevPage={documentsResult?.meta.hasPrevPage}
        onPageChange={setPage}
        onRowSelect={(id) => router.push(`/dashboard/documents/${id}`)}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        showMyTurnFilter={showMyTurnFilter}
        showStatusFilter={showStatusFilter}
      />
    </PageContainer>
  );
}

'use client';

import { useState } from 'react';
import {
  EMPTY_DOCUMENTS_FILTERS,
  type DocumentsFilters,
} from '../_components/DocumentsFilterPanel';

/** Estado de página + filtros compartido por las vistas de listado de documentos:
 * cambiar los filtros siempre vuelve a la primera página. */
export function useDocumentsListState() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<DocumentsFilters>(
    EMPTY_DOCUMENTS_FILTERS,
  );

  function handleFiltersChange(nextFilters: DocumentsFilters) {
    setFilters(nextFilters);
    setPage(1);
  }

  return { page, setPage, filters, handleFiltersChange };
}

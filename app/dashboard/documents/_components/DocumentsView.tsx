'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PageContainer from '@/app/dashboard/_components/PageContainer';
import { DataTablePageHeader } from '@/components/data-table/data-table-page-header';
import DocumentsTable from './DocumentsTable';
import DocumentsFilterButton from './DocumentsFilterButton';
import DocumentsFilterChips from './DocumentsFilterChips';
import { useDocuments } from '../_hooks/useDocuments';
import { useDocumentsListState } from '../_hooks/useDocumentsListState';
import {
  activeFilterChips,
  DEFAULT_DOCUMENTS_FILTERS,
  DOCUMENT_VIEW_LABELS,
  type DocumentsFilters,
} from '../_config/filters';
import { DOCUMENTS_SECTIONS } from '../_config/sections';

/** Lo que dice la tabla si la consulta del listado falla. */
export const DOCUMENTS_LOAD_ERROR_MESSAGE =
  'No se pudieron cargar los documentos. Intenta de nuevo más tarde.';

/**
 * Cuánto se espera tras la última tecla antes de consultar.
 *
 * Sin esta pausa, escribir "contrato" son ocho peticiones de las que siete se descartan; con ella
 * es una. Corto a propósito: por encima de medio segundo la lista se siente trabada.
 */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Estado vacío del filtro "Archivados": dice por qué no hay nada y cómo volver a lo activo.
 *
 * Distingue dos vacíos que no significan lo mismo. Sin ningún otro filtro ni búsqueda, el usuario
 * simplemente no ha archivado nada, y se le explica cómo se archiva. Con otros filtros, puede que
 * sí tenga archivados y sea la combinación la que no encuentra ninguno: decirle "no tienes
 * archivados" ahí sería falso.
 *
 * @param props.filters - Filtros aplicados, con `archived` encendido.
 * @param props.onShowActive - Apaga el filtro de archivados y conserva el resto.
 * @returns El mensaje y el botón para volver a los documentos activos.
 *
 * @example
 * ```tsx
 * <ArchivedEmptyState filters={filters} onShowActive={() => …} />
 * ```
 */
function ArchivedEmptyState({
  filters,
  onShowActive,
}: {
  filters: DocumentsFilters;
  onShowActive: () => void;
}) {
  const hasOtherCriteria =
    activeFilterChips(filters).length > 1 || filters.search !== '';

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">
          {hasOtherCriteria
            ? 'Ningún documento archivado coincide con la búsqueda o los filtros'
            : 'No tienes documentos archivados'}
        </p>
        <p className="text-sm text-muted-foreground">
          {hasOtherCriteria
            ? 'Prueba con otros criterios o vuelve a tus documentos activos.'
            : 'Archiva un documento firmado desde su menú de acciones para encontrarlo aquí.'}
        </p>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={onShowActive}>
        Ver documentos activos
      </Button>
    </div>
  );
}

/**
 * La pantalla de documentos: una sola lista con búsqueda y filtros.
 *
 * Sustituye a "Por firmar", "Enviados para firma" y "Completados", que eran tres rutas con la
 * misma tabla y distinta consulta. Repartir la bandeja en tres obligaba a saber de antemano en
 * cuál había caído cada documento —y la respuesta cambiaba sola: firmar movía el documento de una
 * sección a otra— así que buscar significaba recorrer las tres a mano.
 *
 * Lo que antes era la sección ahora es el filtro `view`, con `requires_my_signature` por omisión:
 * la pantalla sigue abriendo por lo que hay que hacer, pero ya se puede mirar el resto sin salir
 * de ella.
 */
export default function DocumentsView() {
  const router = useRouter();
  const {
    page,
    pageSize,
    filters,
    goToPage,
    setPageSize,
    syncWithTotalPages,
    handleFiltersChange,
  } = useDocumentsListState();

  /**
   * Lo tecleado se guarda aparte de los filtros y sólo baja a ellos tras la pausa. Si el input
   * leyera de `filters.search`, cada tecla dispararía consulta y re-render, y el cursor
   * competiría con la respuesta que va llegando.
   */
  const [searchInput, setSearchInput] = useState(filters.search);

  useEffect(() => {
    if (searchInput === filters.search) return;

    const timeout = setTimeout(
      () => handleFiltersChange({ ...filters, search: searchInput }),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timeout);
    // `filters` y `handleFiltersChange` se leen dentro del timeout, pero no van en las
    // dependencias: incluirlos reprogramaría la pausa en cada cambio de cualquier filtro. La
    // comparación de arriba es la que corta el ciclo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput, filters.search]);

  const documentsQuery = useDocuments({ filters, page, limit: pageSize });
  const result = documentsQuery.data;
  /**
   * Respuesta de la página anterior, conservada mientras llega la pedida (ver `useDocuments`).
   * Sirve para que los controles sepan cuántas páginas hay; sus filas no se pintan.
   */
  const isShowingPreviousPage = documentsQuery.isPlaceholderData;
  /**
   * Con una respuesta definitiva, la página se corrige si ya no existe: pasa al archivar o
   * cancelar el último documento de la última página, cuando el refetch trae una página menos.
   * Mientras se corrige se muestra la carga, no un "no hay documentos" falso.
   */
  const isCorrectingPage =
    result !== undefined &&
    !isShowingPreviousPage &&
    syncWithTotalPages(result.pagination.totalPages);
  const knownTotalPages = result?.pagination.totalPages ?? 1;
  const isDefaultView = filters.view === DEFAULT_DOCUMENTS_FILTERS.view;

  return (
    <PageContainer>
      {/* Única puerta de entrada al alta desde la navegación: dejó de ser una entrada del
        sidebar, así que se ofrece acá, sobre la bandeja a la que el documento nuevo va a
        parar. La ruta es la misma de siempre y sigue abriéndose por URL directa. */}
      <DataTablePageHeader
        className="mb-4"
        title={DOCUMENTS_SECTIONS.list.label}
        actions={
          <Button
            nativeButton={false}
            render={<Link href={DOCUMENTS_SECTIONS.create.href} />}
          >
            <Plus />
            {DOCUMENTS_SECTIONS.create.label}
          </Button>
        }
      />

      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            type="search"
            aria-label="Buscar por nombre del documento o participante"
            placeholder="Buscar por nombre del documento o participante"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>
        <DocumentsFilterButton
          filters={filters}
          onChange={handleFiltersChange}
        />
      </div>
      
      <p className="mb-3 text-sm text-primary">
        {isDefaultView ? 'Vista predeterminada: ' : 'Vista: '}
        {DOCUMENT_VIEW_LABELS[filters.view]}
      </p>

      <DocumentsFilterChips filters={filters} onChange={handleFiltersChange} />

      <DocumentsTable
        documents={
          isShowingPreviousPage || isCorrectingPage ? [] : (result?.items ?? [])
        }
        // La página pedida y no la de la respuesta: mientras carga, el indicador ya dice a dónde
        // se va, y los botones se calculan desde ahí.
        page={page}
        totalPages={knownTotalPages}
        onPageChange={(nextPage) => goToPage(nextPage, knownTotalPages)}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        onRowSelect={(id) => router.push(`/dashboard/documents/${id}`)}
        // `isPending` y no `isLoading`: también cubre la espera a la cuenta activa (la consulta
        // está deshabilitada hasta entonces) y cada cambio de filtro, cuenta o tamaño, que
        // estrena `queryKey` sin datos. Al pasar de página la consulta tiene el placeholder de la
        // anterior, que tampoco es un resultado definitivo; y mientras se corrige una página
        // fuera de rango, la respuesta vacía tampoco lo es.
        isLoading={
          documentsQuery.isPending || isShowingPreviousPage || isCorrectingPage
        }
        errorMessage={
          documentsQuery.isError ? DOCUMENTS_LOAD_ERROR_MESSAGE : undefined
        }
        canArchiveRows={!filters.archived}
        canRestoreRows={filters.archived}
        emptyState={
          // Sólo con respuesta: mientras carga, la lista también llega vacía.
          documentsQuery.isSuccess && filters.archived ? (
            <ArchivedEmptyState
              filters={filters}
              onShowActive={() =>
                handleFiltersChange({ ...filters, archived: false })
              }
            />
          ) : undefined
        }
      />
    </PageContainer>
  );
}

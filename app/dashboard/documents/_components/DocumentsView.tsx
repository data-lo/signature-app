'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PageContainer from '@/app/dashboard/_components/PageContainer';
import DocumentsTable from './DocumentsTable';
import DocumentsFilterButton from './DocumentsFilterButton';
import DocumentsFilterChips from './DocumentsFilterChips';
import { useDocuments } from '../_hooks/useDocuments';
import { useDocumentsListState } from '../_hooks/useDocumentsListState';
import {
  DEFAULT_DOCUMENTS_FILTERS,
  DOCUMENT_VIEW_LABELS,
} from '../_config/filters';
import { DOCUMENTS_SECTIONS } from '../_config/sections';

const DOCUMENTS_PAGE_SIZE = 25;

/**
 * Cuánto se espera tras la última tecla antes de consultar.
 *
 * Sin esta pausa, escribir "contrato" son ocho peticiones de las que siete se descartan; con ella
 * es una. Corto a propósito: por encima de medio segundo la lista se siente trabada.
 */
const SEARCH_DEBOUNCE_MS = 300;

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
  const { page, setPage, filters, handleFiltersChange } =
    useDocumentsListState();
  const { limit, showMyTurnFilter, showStatusFilter, showArchiveAction } =
    DOCUMENTS_LIST_CONFIG[type];

  const documentsQuery = useDocuments({
    filters,
    page,
    limit: DOCUMENTS_PAGE_SIZE,
  });
  const result = documentsQuery.data;
  const isDefaultView = filters.view === DEFAULT_DOCUMENTS_FILTERS.view;

  return (
    <PageContainer>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-lg font-semibold text-foreground">
          {DOCUMENTS_SECTIONS.list.label}
        </h1>
        <Button
          nativeButton={false}
          render={<Link href={DOCUMENTS_SECTIONS.create.href} />}
        >
          <Plus />
          {DOCUMENTS_SECTIONS.create.label}
        </Button>
      </div>

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

      {/* Qué recorte está aplicado, siempre a la vista: es lo que antes decía el sidebar por el
        solo hecho de estar en una sección u otra. */}
      <p className="mb-3 text-sm text-primary">
        {isDefaultView ? 'Vista predeterminada: ' : 'Vista: '}
        {DOCUMENT_VIEW_LABELS[filters.view]}
      </p>

      <DocumentsFilterChips filters={filters} onChange={handleFiltersChange} />

      <DocumentsTable
        documents={result?.items ?? []}
        page={result?.pagination.page}
        totalPages={result?.pagination.totalPages}
        onPageChange={setPage}
        onRowSelect={(id) => router.push(`/dashboard/documents/${id}`)}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        showMyTurnFilter={showMyTurnFilter}
        showStatusFilter={showStatusFilter}
        showArchiveAction={showArchiveAction}
      />
    </PageContainer>
  );
}

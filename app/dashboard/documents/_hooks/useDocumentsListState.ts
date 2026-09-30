'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { DocumentView } from '@/lib/enums/document';
import { useAuthStore } from '@/lib/store/useAuthStore';
import {
  DEFAULT_DOCUMENTS_FILTERS,
  type DocumentsFilters,
} from '../_config/filters';
import {
  clampDocumentsPage,
  DEFAULT_DOCUMENTS_PAGE_SIZE,
  type DocumentsPageSize,
} from '../_config/pagination';

const VALID_VIEWS = Object.values(DocumentView) as string[];

/**
 * Con qué recorte abre la pantalla: el de `?view=` si es uno conocido, o el de por omisión.
 *
 * Es lo que hace que las rutas viejas sigan significando algo. `/documents/completed` ya no
 * existe, pero redirige a `?view=completed` (ver `next.config.ts`), así que quien llegue por un
 * enlace guardado ve lo que iba a ver y no una lista genérica.
 *
 * Un valor desconocido se ignora en vez de tratarse como error: viene de la barra de direcciones,
 * donde cualquiera puede escribir cualquier cosa, y no hay nada que un mensaje de error le
 * permitiría corregir a quien sólo quería ver sus documentos.
 */
function initialFilters(view: string | null): DocumentsFilters {
  if (view && VALID_VIEWS.includes(view)) {
    return { ...DEFAULT_DOCUMENTS_FILTERS, view: view as DocumentView };
  }
  return DEFAULT_DOCUMENTS_FILTERS;
}

/**
 * Página, tamaño de página y filtros del listado unificado.
 *
 * **Vuelve a la primera página** cuando cambia cualquier filtro (incluida la búsqueda), el tamaño
 * de página o la cuenta activa. Sin eso, filtrar desde la página 3 puede dejar la lista vacía
 * aunque haya resultados —los nuevos criterios devuelven menos páginas— y parece que no se
 * encontró nada cuando lo que pasó es que se quedó fuera del rango. Con la cuenta pasa lo mismo:
 * la página 3 de una cuenta no tiene por qué existir en la otra.
 *
 * **La página nunca sale del rango**: `goToPage` la acota con el `totalPages` conocido, y
 * `syncWithTotalPages` la corrige cuando un refetch trae menos páginas (p. ej. tras archivar o
 * cancelar el último documento de la última página).
 *
 * @returns La página, el tamaño, los filtros y las funciones para cambiarlos.
 *
 * @example
 * ```ts
 * const { page, pageSize, goToPage } = useDocumentsListState();
 * goToPage(page + 1, result.pagination.totalPages);
 * ```
 */
export function useDocumentsListState() {
  const searchParams = useSearchParams();
  const activeAccountId = useAuthStore((state) => state.activeAccount?.id);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState<DocumentsPageSize>(
    DEFAULT_DOCUMENTS_PAGE_SIZE,
  );
  /**
   * La cuenta para la que vale `page`. Se compara durante el render —y no en un efecto— para que
   * la consulta de la cuenta nueva ya salga con la página 1, sin una petición intermedia con la
   * página vieja.
   */
  const [pageAccountId, setPageAccountId] = useState(activeAccountId);
  if (pageAccountId !== activeAccountId) {
    setPageAccountId(activeAccountId);
    setPage(1);
  }
  /**
   * `?view=` se lee UNA vez, como estado inicial: a partir de ahí manda lo que el usuario elija
   * en pantalla. Mantenerlos sincronizados haría que cambiar de filtro reescribiera la URL y que
   * el botón "atrás" del navegador deshiciera filtros de uno en uno, que no es lo que espera
   * quien está filtrando.
   */
  const [filters, setFilters] = useState<DocumentsFilters>(() =>
    initialFilters(searchParams.get('view')),
  );

  function handleFiltersChange(nextFilters: DocumentsFilters) {
    setFilters(nextFilters);
    setPage(1);
  }

  /**
   * Cambia de página sin salir del rango.
   *
   * @param nextPage - Página pedida por los controles.
   * @param totalPages - `pagination.totalPages` conocido.
   */
  function goToPage(nextPage: number, totalPages: number) {
    setPage(clampDocumentsPage(nextPage, totalPages));
  }

  /**
   * Cambia el tamaño de página y vuelve a la primera: con otro tamaño, la página actual apunta a
   * otros documentos (o a ninguno).
   *
   * @param nextPageSize - Tamaño elegido en el selector.
   */
  function setPageSize(nextPageSize: DocumentsPageSize) {
    setPageSizeState(nextPageSize);
    setPage(1);
  }

  /**
   * Corrige la página si la respuesta dice que ya no existe. Se llama durante el render con la
   * paginación de una respuesta definitiva, así que la corrección no llega a pintar un "no hay
   * documentos" falso.
   *
   * @param totalPages - `pagination.totalPages` de la respuesta.
   * @returns `true` si la página estaba fuera de rango y se corrigió.
   */
  function syncWithTotalPages(totalPages: number): boolean {
    const validPage = clampDocumentsPage(page, totalPages);
    if (validPage === page) return false;
    setPage(validPage);
    return true;
  }

  return {
    page,
    pageSize,
    filters,
    goToPage,
    setPageSize,
    syncWithTotalPages,
    handleFiltersChange,
  };
}

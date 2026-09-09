'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { DocumentView } from '@/lib/enums/document';
import {
  DEFAULT_DOCUMENTS_FILTERS,
  type DocumentsFilters,
} from '../_config/filters';

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
 * Página + filtros del listado unificado.
 *
 * Cambiar cualquier filtro vuelve a la primera página. Sin eso, filtrar desde la página 3 puede
 * dejar la lista vacía aunque haya resultados —los nuevos filtros devuelven menos páginas— y
 * parece que el filtro no encontró nada cuando lo que pasó es que se quedó fuera del rango.
 */
export function useDocumentsListState() {
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
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

  return { page, setPage, filters, handleFiltersChange };
}

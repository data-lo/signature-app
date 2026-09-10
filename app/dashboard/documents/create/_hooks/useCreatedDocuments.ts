'use client';

import { useEffect, useMemo, useState } from 'react';
import { useDocumentsCount } from '@/app/_components/DocumentsCountContext';
import { getErrorMessage } from '@/lib/error-handler';
import { DocumentView } from '@/lib/enums/document';
import { useDocuments } from '../../_hooks/useDocuments';
import { DEFAULT_DOCUMENTS_FILTERS } from '../../_config/filters';

/** Cuántos documentos enviados se listan dentro de la pantalla de creación. */
const CREATED_DOCUMENTS_PAGE_SIZE = 10;

interface UseCreatedDocumentsParams {
  /**
   * Publica el total de documentos en `DocumentsCountContext` (lo consume el badge del navbar).
   * Se puede apagar cuando la pantalla se renderiza dentro de una sección deshabilitada por
   * onboarding incompleto: ahí la consulta debe seguir corriendo (la tabla muestra contenido
   * real, no un placeholder) pero el conteo no debe salir al resto de la app.
   */
  trackDocumentsCount: boolean;
}

/**
 * Los documentos que el usuario ya envió a firma, dentro de la pantalla de creación.
 *
 * Es el mismo listado unificado con el recorte `created_by_me`, no una consulta aparte. Antes
 * pedía `type: 'sent'`, que el backend traducía a "creados por mí O donde participo": la tabla de
 * "tus documentos" acababa mostrando también documentos ajenos que el usuario sólo firmaba, y el
 * badge del navbar los contaba. Ahora significa lo que dice.
 */
export function useCreatedDocuments({
  trackDocumentsCount,
}: UseCreatedDocumentsParams) {
  /**
   * La página se lleva acá y no con `useDocumentsListState`, que es el estado de la PANTALLA de
   * documentos: aquél lee además el recorte inicial de `?view=`, y esta tabla no se configura por
   * la URL — vive dentro del formulario de creación, donde ese parámetro no significa nada.
   */
  const [page, setPage] = useState(1);
  /**
   * Filtros fijos: esta tabla no ofrece filtrado propio —para eso está la pantalla de
   * documentos— y dejarlos constantes evita que la queryKey cambie en cada render y vuelva a
   * consultar sola.
   */
  const filters = useMemo(
    () => ({ ...DEFAULT_DOCUMENTS_FILTERS, view: DocumentView.CreatedByMe }),
    [],
  );

  const createdDocumentsQuery = useDocuments({
    filters,
    page,
    limit: CREATED_DOCUMENTS_PAGE_SIZE,
  });
  const { setDocumentsCount } = useDocumentsCount();

  const createdDocuments = createdDocumentsQuery.data;
  useEffect(() => {
    if (createdDocuments && trackDocumentsCount) {
      setDocumentsCount(createdDocuments.pagination.total);
    }
  }, [createdDocuments, trackDocumentsCount, setDocumentsCount]);

  return {
    createdDocumentsQuery,
    page,
    setPage,
    errorMessage: createdDocumentsQuery.isError
      ? getErrorMessage(
          createdDocumentsQuery.error,
          'No se pudieron cargar tus documentos. Intenta de nuevo.',
        )
      : undefined,
  };
}

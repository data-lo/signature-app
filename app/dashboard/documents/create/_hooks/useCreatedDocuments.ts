'use client';

import { useEffect } from 'react';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useDocumentsCount } from '@/app/_components/DocumentsCountContext';
import { getErrorMessage } from '@/lib/error-handler';
import { useDocuments } from '../../_hooks/useDocuments';
import { useDocumentsListState } from '../../_hooks/useDocumentsListState';

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
 * Listado de documentos creados por el usuario en sesión: paginación, filtros, la consulta y la
 * publicación del conteo global. Se extrae de la pantalla para que `CreateDocumentView` no tenga
 * que coordinar tres piezas de estado que solo le importan a esta tabla.
 */
export function useCreatedDocuments({
  trackDocumentsCount,
}: UseCreatedDocumentsParams) {
  const { page, setPage, filters, handleFiltersChange } =
    useDocumentsListState();
  const currentUserQuery = useCurrentUser();
  const createdDocumentsQuery = useDocuments({
    scope: 'creator',
    email: currentUserQuery.data?.email,
    page,
    limit: CREATED_DOCUMENTS_PAGE_SIZE,
    filters,
  });
  const { setDocumentsCount } = useDocumentsCount();

  const createdDocuments = createdDocumentsQuery.data;
  useEffect(() => {
    if (createdDocuments && trackDocumentsCount) {
      setDocumentsCount(createdDocuments.meta.total);
    }
  }, [createdDocuments, trackDocumentsCount, setDocumentsCount]);

  return {
    createdDocumentsQuery,
    page,
    setPage,
    filters,
    handleFiltersChange,
    errorMessage: createdDocumentsQuery.isError
      ? getErrorMessage(
          createdDocumentsQuery.error,
          'No se pudieron cargar tus documentos. Intenta de nuevo.',
        )
      : undefined,
  };
}

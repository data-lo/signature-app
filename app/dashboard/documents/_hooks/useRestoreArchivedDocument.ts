'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/error-handler';
import { restoreArchivedDocumentRequest } from '../_requests';

/** Confirmación al recuperar: dice dónde quedó el documento. */
export const RESTORE_SUCCESS_MESSAGE =
  'Documento recuperado. Ya aparece de nuevo en tu listado.';

/** Lo que se le dice a quien el backend no deja recuperar. Dice qué hacer, no qué falló por dentro. */
export const RESTORE_FORBIDDEN_MESSAGE =
  'No tienes permiso para recuperar este documento. Si lo necesitas, pide a un administrador de la organización que revise tu rol.';

/** Mensaje genérico cuando el backend no manda uno propio. */
export const RESTORE_GENERIC_ERROR_MESSAGE =
  'Ocurrió un error al recuperar el documento. Intenta de nuevo.';

/**
 * Traduce el rechazo de `DELETE /document/:id/archive` al mensaje que ve el usuario.
 *
 * Como al archivar, el 403 lleva texto propio: el del backend sale de la Policy del detalle y
 * habla de "consultar" el documento.
 *
 * @param error - Lo que rechazó la petición.
 * @returns El mensaje para el aviso de error.
 *
 * @example
 * ```ts
 * restoreErrorMessage(axiosErrorWithStatus403); // RESTORE_FORBIDDEN_MESSAGE
 * ```
 */
export function restoreErrorMessage(error: unknown): string {
  if (isAxiosError(error) && error.response?.status === 403) {
    return RESTORE_FORBIDDEN_MESSAGE;
  }

  return getErrorMessage(error, RESTORE_GENERIC_ERROR_MESSAGE);
}

/**
 * Recupera un documento archivado: sale de "Archivados" y vuelve al listado del usuario.
 *
 * Igual que `useArchiveCompletedDocument`, la fila se mueve por refetch y no editando el caché: se
 * invalida `['documents']` entero, porque el documento puede estar cacheado a la vez en la vista
 * de archivados (de donde debe salir) y en la de activos (a la que debe volver), cada una con sus
 * filtros, página y límite.
 *
 * @returns La mutación de React Query; `mutate` recibe el id del documento.
 *
 * @example
 * ```ts
 * const restoreMutation = useRestoreArchivedDocument();
 * restoreMutation.mutate('doc-1');
 * ```
 */
export function useRestoreArchivedDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documentId: string) =>
      restoreArchivedDocumentRequest(documentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success(RESTORE_SUCCESS_MESSAGE);
    },
    onError: (error) => {
      toast.error(restoreErrorMessage(error));
    },
  });
}

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/error-handler';
import { archiveDocumentRequest } from '../_requests';

/** Lo que se le dice a quien el backend no deja archivar. Dice qué hacer, no qué falló por dentro. */
export const ARCHIVE_FORBIDDEN_MESSAGE =
  'No tienes permiso para archivar este documento. Si lo necesitas, pide a un administrador de la organización que revise tu rol.';

/** Mensaje genérico cuando el backend no manda uno propio. */
export const ARCHIVE_GENERIC_ERROR_MESSAGE =
  'Ocurrió un error al archivar el documento. Intenta de nuevo.';

/**
 * Traduce el rechazo de `POST /document/:id/archive` al mensaje que ve el usuario.
 *
 * Un 403 lleva su propio texto porque el del backend no sirve aquí: la autorización de archivar
 * es la misma Policy que la del detalle, y su mensaje habla de "consultar" el documento. El resto
 * —el 400 de un documento que no está firmado, el 404— sí trae un mensaje del backend que se
 * entiende tal cual.
 *
 * @param error - Lo que rechazó la petición.
 * @returns El mensaje para el aviso de error.
 *
 * @example
 * ```ts
 * archiveErrorMessage(axiosErrorWithStatus403); // ARCHIVE_FORBIDDEN_MESSAGE
 * ```
 */
export function archiveErrorMessage(error: unknown): string {
  if (isAxiosError(error) && error.response?.status === 403) {
    return ARCHIVE_FORBIDDEN_MESSAGE;
  }

  return getErrorMessage(error, ARCHIVE_GENERIC_ERROR_MESSAGE);
}

/**
 * Archiva un documento completado y lo saca del listado del usuario.
 *
 * **La fila desaparece por refetch y no borrándola del caché a mano.** El backend ya excluye del
 * listado lo que este usuario archivó, así que invalidar la consulta trae la lista correcta —con
 * su paginación y su total recalculados— en vez de dejar una página de 24 elementos que dice 25.
 *
 * Se invalida `['documents']` entero, sin más partes de la clave: la lista está partida por
 * cuenta activa, filtros, página y límite (ver `useDocuments`), y el documento archivado puede
 * estar cacheado en varias de esas combinaciones a la vez.
 *
 * Bug corregido: se invalidaba `['myDocuments']`, el nombre que la clave tuvo antes de unificar
 * el listado. Ninguna consulta la declaraba ya, así que la invalidación no alcanzaba a nada y la
 * fila archivada seguía en pantalla hasta recargar. No dio error porque invalidar una clave
 * inexistente es una operación válida: simplemente no encuentra nada que refrescar.
 */
export function useArchiveCompletedDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documentId: string) => archiveDocumentRequest(documentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Documento archivado');
    },
    onError: (error) => {
      toast.error(archiveErrorMessage(error));
    },
  });
}

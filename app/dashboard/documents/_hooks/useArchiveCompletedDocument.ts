'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/error-handler';
import { archiveDocumentRequest } from '../_requests';

/**
 * Archiva un documento completado y lo saca del listado del usuario.
 *
 * **La fila desaparece por refetch y no borrándola del caché a mano.** El backend ya excluye del
 * listado lo que este usuario archivó, así que invalidar la consulta trae la lista correcta —con
 * su paginación y su total recalculados— en vez de dejar una página de 24 elementos que dice 25.
 *
 * Se invalida `['myDocuments']` entero, sin más partes de la clave: la lista está partida por
 * cuenta activa, sección, página y filtros (ver `useDocuments`), y el documento archivado puede
 * estar cacheado en varias de esas combinaciones a la vez.
 */
export function useArchiveCompletedDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documentId: string) => archiveDocumentRequest(documentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['myDocuments'] });
      toast.success('Documento archivado');
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(
          error,
          'Ocurrió un error al archivar el documento. Intenta de nuevo.',
        ),
      );
    },
  });
}

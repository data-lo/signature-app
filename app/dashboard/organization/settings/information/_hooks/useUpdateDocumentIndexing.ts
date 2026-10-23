'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { getErrorMessage } from '@/lib/error-handler';
import {
  updateOrganizationRequest,
  type OrganizationProfile,
} from '@/lib/api/organizations';
import { organizationQueryKey } from '@/lib/hooks/useOrganization';
import { useAuthStore } from '@/lib/store/useAuthStore';

/** Confirmación al encender la indexación. */
export const DOCUMENT_INDEXING_ENABLED_MESSAGE =
  'Indexación de documentos activada';

/** Confirmación al apagar la indexación. */
export const DOCUMENT_INDEXING_DISABLED_MESSAGE =
  'Indexación de documentos desactivada';

/** Error genérico cuando el backend no da un motivo que se pueda mostrar. */
export const DOCUMENT_INDEXING_ERROR_MESSAGE =
  'No pudimos guardar la configuración de búsqueda inteligente. Intenta de nuevo.';

/**
 * Guarda el interruptor "Habilitar indexación de documentos" de una organización.
 *
 * Manda sólo `indexDocuments` a `PATCH /organizations/:organizationId`, sin tocar el resto del
 * perfil. Al terminar bien:
 * - **Escribe la respuesta en la caché** del perfil (`['organization', organizationId]`). El
 *   backend devuelve el perfil completo tal como quedó, así que la tarjeta pinta lo guardado y no
 *   lo que se pidió, sin volver a consultarlo.
 * - **Actualiza el catálogo de cuentas del store** (`setOrganizationIndexDocuments`), que es de
 *   donde crear documento lee si ofrece Búsqueda Inteligente: sin esto la opción seguiría
 *   visible hasta recargar.
 * - Muestra la confirmación según el valor guardado.
 *
 * Si falla, no toca ninguna de las dos cachés —el interruptor sigue mostrando el valor
 * persistido— y avisa con el motivo del backend o uno genérico.
 *
 * @param organizationId - Organización cuyo interruptor se cambia.
 * @returns La mutación de React Query; `mutate` recibe el valor nuevo del interruptor.
 *
 * @example
 * ```ts
 * const indexingMutation = useUpdateDocumentIndexing('org-1');
 * indexingMutation.mutate(false);
 * ```
 */
export function useUpdateDocumentIndexing(organizationId: string) {
  const queryClient = useQueryClient();
  const setOrganizationIndexDocuments = useAuthStore(
    (state) => state.setOrganizationIndexDocuments,
  );

  return useMutation({
    mutationFn: (indexDocuments: boolean) =>
      updateOrganizationRequest(organizationId, { indexDocuments }),
    onSuccess: (organization: OrganizationProfile) => {
      queryClient.setQueryData(
        organizationQueryKey(organizationId),
        organization,
      );
      setOrganizationIndexDocuments(
        organizationId,
        organization.indexDocuments,
      );
      toast.success(
        organization.indexDocuments
          ? DOCUMENT_INDEXING_ENABLED_MESSAGE
          : DOCUMENT_INDEXING_DISABLED_MESSAGE,
      );
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, DOCUMENT_INDEXING_ERROR_MESSAGE));
    },
  });
}

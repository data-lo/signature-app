'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { getErrorMessage } from '@/lib/error-handler';
import {
  updateOrganizationRequest,
  type OrganizationProfile,
  type UpdateOrganizationPayload,
} from '@/lib/api/organizations';
import { organizationQueryKey } from '@/lib/hooks/useOrganization';
import { useAuthStore } from '@/lib/store/useAuthStore';

/** Confirmación que se muestra al guardar. */
export const ORGANIZATION_UPDATED_MESSAGE =
  'Información de la organización actualizada correctamente';

/** Error genérico cuando el backend no da un motivo que se pueda mostrar. */
export const ORGANIZATION_UPDATE_ERROR_MESSAGE =
  'No pudimos guardar la información de la organización. Intenta de nuevo.';

/**
 * Guarda "Información de la organización" y deja la pantalla mostrando lo guardado.
 *
 * Al terminar bien:
 * - **Escribe la respuesta en la caché** del perfil (`organizationQueryKey`). El backend devuelve
 *   el perfil completo tal como quedó, así que no hace falta volver a pedirlo, y el formulario —que
 *   toma sus valores de esa consulta— se reinicia con ellos y deja de estar "modificado".
 * - **Renombra la organización en el catálogo de cuentas del store**, para que el selector no
 *   siga mostrando el nombre viejo hasta recargar. El backend ya refrescó el catálogo cacheado en
 *   Redis de todos los miembros; esto es sólo el espejo en memoria de quien guardó.
 * - Muestra la confirmación. No navega: el usuario se queda en la pantalla que estaba editando.
 *
 * Si falla, muestra el motivo que dé el backend (p. ej. el mensaje de validación de un 400) o uno
 * genérico, y el formulario conserva lo capturado para reintentar.
 *
 * @param organizationId - Organización que se edita.
 * @returns La mutación de React Query; `mutate` recibe sólo los campos modificados.
 *
 * @example
 * ```ts
 * const updateMutation = useUpdateOrganization('org-1');
 * updateMutation.mutate({ phoneNumber: '5512345678' });
 * ```
 */
export function useUpdateOrganization(organizationId: string) {
  const queryClient = useQueryClient();
  const renameOrganization = useAuthStore((state) => state.renameOrganization);

  return useMutation({
    mutationFn: (payload: UpdateOrganizationPayload) =>
      updateOrganizationRequest(organizationId, payload),
    onSuccess: (organization: OrganizationProfile) => {
      queryClient.setQueryData(
        organizationQueryKey(organizationId),
        organization,
      );
      renameOrganization(organizationId, {
        name: organization.name,
        displayName: organization.displayName,
      });
      toast.success(ORGANIZATION_UPDATED_MESSAGE);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, ORGANIZATION_UPDATE_ERROR_MESSAGE));
    },
  });
}

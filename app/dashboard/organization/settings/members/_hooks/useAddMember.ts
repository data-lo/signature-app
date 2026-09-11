'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/error-handler';
import { addOrganizationMemberRequest } from '@/lib/api/organization-members';

/**
 * Alta directa de un miembro que ya tiene cuenta en la plataforma.
 *
 * Es el camino corto frente a la invitación por correo: aquí no hay nada que esperar, así que al
 * terminar se invalida la lista para que la fila aparezca ya con su rol y sus permisos.
 *
 * Los errores del backend se muestran tal cual llegan (`getErrorMessage`): "no existe un usuario
 * con ese correo", "ya es miembro" o "tiene una membresía dada de baja" son justamente lo que el
 * administrador necesita leer para saber si le toca invitar, reactivar o no hacer nada.
 *
 * @param organizationId - Organización activa, para invalidar su lista de miembros al terminar.
 * @returns La mutación de react-query lista para `mutate({ email, roleId, position })`.
 *
 * @example
 * ```ts
 * const addMember = useAddMember(organizationId);
 * addMember.mutate({ email: 'ana@empresa.com', roleId }, { onSuccess: closeModal });
 * ```
 */
export function useAddMember(organizationId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addOrganizationMemberRequest,
    onSuccess: () => {
      toast.success('Miembro agregado correctamente');
      queryClient.invalidateQueries({
        queryKey: ['organizationMembers', organizationId],
      });
    },
    onError: (error) => {
      console.error('[organization-members] falló agregar el miembro:', error);
      toast.error(
        getErrorMessage(
          error,
          'Ocurrió un error al agregar al miembro. Intenta de nuevo.',
        ),
      );
    },
  });
}

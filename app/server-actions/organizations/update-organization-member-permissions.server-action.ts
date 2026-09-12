'use server';

import { revalidatePath } from 'next/cache';
import { backendRequest } from '@/lib/server/backend-request';
import { organizationMembersPath } from './_paths';
import { toFailedResult, type ActionResult } from './_result';

/**
 * Asigna a un miembro las etiquetas del catálogo propio de su organización.
 *
 * Reemplaza el conjunto completo, no añade: lo que no venga en `permissionIds` queda desasignado.
 * Es lo que espera el modal, que manda siempre todas las casillas marcadas.
 *
 * Estas etiquetas NO otorgan acceso técnico a ningún endpoint —eso lo decide el rol—, así que
 * cambiarlas no altera lo que la persona puede hacer. Se revalida igual porque el listado las
 * muestra.
 *
 * @param accountId - Membresía cuyas etiquetas se reemplazan.
 * @param organizationId - Organización, para revalidar la ruta de la sección al terminar.
 * @param permissionIds - Conjunto completo de etiquetas que quedarán asignadas.
 * @returns `{ ok: true }`, o el motivo del rechazo cuando el backend lo explica.
 * @throws Nada: los fallos vuelven como resultado para poder mostrarlos.
 *
 * @example
 * ```ts
 * const result = await updateOrganizationMemberPermissionsAction(
 *   accountId,
 *   organizationId,
 *   ['permission-1'],
 * );
 * ```
 */
export async function updateOrganizationMemberPermissionsAction(
  accountId: string,
  organizationId: string,
  permissionIds: string[],
): Promise<ActionResult> {
  try {
    await backendRequest<unknown>(
      `organizations/members/${accountId}/permissions`,
      {
        method: 'PATCH',
        body: { permissionIds },
      },
    );
  } catch (error) {
    return toFailedResult(
      error,
      'Ocurrió un error al actualizar los permisos. Intenta de nuevo.',
    );
  }

  revalidatePath(organizationMembersPath(organizationId));
  return { ok: true };
}

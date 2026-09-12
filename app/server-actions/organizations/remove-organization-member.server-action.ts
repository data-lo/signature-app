'use server';

import { revalidatePath } from 'next/cache';
import { backendRequest } from '@/lib/server/backend-request';
import { organizationMembersPath } from './_paths';
import { toFailedResult, type ActionResult } from './_result';

/**
 * Da de baja a un miembro de la organización.
 *
 * La membresía no se borra: conserva su fila con el estado `removed`, que es lo que permite
 * distinguir a quien nunca estuvo de quien salió, y lo que hace que volver a darlo de alta
 * reactive su fila en vez de crear una segunda.
 *
 * @param accountId - Membresía a dar de baja.
 * @param organizationId - Organización, para revalidar la ruta de la sección al terminar.
 * @returns `{ ok: true }`, o el motivo del rechazo cuando el backend lo explica.
 * @throws Nada: los fallos vuelven como resultado para poder mostrarlos.
 *
 * @example
 * ```ts
 * const result = await removeOrganizationMemberAction(accountId, organizationId);
 * if (!result.ok) toast.error(result.message);
 * ```
 */
export async function removeOrganizationMemberAction(
  accountId: string,
  organizationId: string,
): Promise<ActionResult> {
  try {
    await backendRequest<unknown>(`organizations/members/${accountId}`, {
      method: 'DELETE',
    });
  } catch (error) {
    return toFailedResult(
      error,
      'Ocurrió un error al eliminar al miembro. Intenta de nuevo.',
    );
  }

  revalidatePath(organizationMembersPath(organizationId));
  return { ok: true };
}

'use server';

import { revalidatePath } from 'next/cache';
import { backendRequest } from '@/lib/server/backend-request';
import { organizationMembersPath } from './_paths';
import { toFailedResult, type ActionResult } from './_result';

/**
 * Cambia el rol de una membresía existente.
 *
 * No manda `X-Account-Id`: este endpoint identifica la membresía por el `accountId` de la ruta y
 * valida contra el `sub` del JWT que el llamador pueda administrarla. Mandar el header sería
 * ruido, y peor: sugeriría que la autorización depende de algo que pone el cliente.
 *
 * Cambiar el rol cambia lo que esa persona puede hacer, así que se revalida la ruta para que la
 * columna de permisos del listado deje de mostrar los del rol anterior.
 *
 * @param accountId - Membresía a modificar.
 * @param organizationId - Organización, para revalidar la ruta de la sección al terminar.
 * @param roleId - Rol nuevo, del catálogo de `GET /roles`.
 * @returns `{ ok: true }`, o el motivo del rechazo cuando el backend lo explica.
 * @throws Nada: los fallos vuelven como resultado para poder mostrarlos.
 *
 * @example
 * ```ts
 * const result = await updateOrganizationMemberRoleAction(
 *   accountId,
 *   organizationId,
 *   roleId,
 * );
 * ```
 */
export async function updateOrganizationMemberRoleAction(
  accountId: string,
  organizationId: string,
  roleId: string,
): Promise<ActionResult> {
  try {
    await backendRequest<unknown>(`organizations/members/${accountId}/role`, {
      method: 'PATCH',
      body: { roleId },
    });
  } catch (error) {
    return toFailedResult(
      error,
      'Ocurrió un error al actualizar el rol. Intenta de nuevo.',
    );
  }

  revalidatePath(organizationMembersPath(organizationId));
  return { ok: true };
}

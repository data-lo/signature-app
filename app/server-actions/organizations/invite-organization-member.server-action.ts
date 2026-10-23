'use server';

import { revalidatePath } from 'next/cache';
import { backendRequest } from '@/lib/server/backend-request';
import type { InviteMemberValues } from '@/lib/api/accounts';
import { organizationMembersPath } from './_paths';
import { toFailedResult, type ActionResult } from './_result';

/**
 * Invita por correo a alguien que todavía NO tiene cuenta en la plataforma.
 *
 * `accountId` llega como argumento porque el backend resuelve la organización desde el header
 * `X-Account-Id`, y ese dato vive en `localStorage`, fuera del alcance del servidor. No abre
 * ningún hueco: es exactamente el mismo valor que el navegador ya mandaba, y
 * `assertHasOrganizationPermission` comprueba en el backend que esa membresía sea del propio
 * llamador antes de hacer nada. Confiar en él aquí sería un error; no se confía.
 *
 * @param accountId - Membresía del llamador en la organización activa (`activeAccount.id`).
 * @param organizationId - Organización, para revalidar la ruta de la sección al terminar.
 * @param values - Correo del invitado y rol que tendrá.
 * @returns `{ ok: true }`, o el motivo del rechazo cuando el backend lo explica.
 * @throws Nada: los fallos vuelven como resultado para poder mostrarlos.
 *
 * @example
 * ```ts
 * const result = await inviteOrganizationMemberAction(accountId, organizationId, {
 *   email: 'ana@empresa.com',
 *   roleId,
 * });
 * if (!result.ok) toast.error(result.message);
 * ```
 */
export async function inviteOrganizationMemberAction(
  accountId: string,
  organizationId: string,
  values: InviteMemberValues,
): Promise<ActionResult> {
  try {
    await backendRequest<unknown>('organizations/invite', {
      method: 'POST',
      body: values,
      accountId,
    });
  } catch (error) {
    return toFailedResult(
      error,
      'Ocurrió un error al enviar la invitación. Intenta de nuevo.',
    );
  }

  revalidatePath(organizationMembersPath(organizationId));
  return { ok: true };
}

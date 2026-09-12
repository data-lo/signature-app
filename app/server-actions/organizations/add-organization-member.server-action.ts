'use server';

import { revalidatePath } from 'next/cache';
import { backendRequest } from '@/lib/server/backend-request';
import type { AddOrganizationMemberValues } from '@/lib/api/organization-members';
import { organizationMembersPath } from './_paths';
import { toFailedResult, type ActionResult } from './_result';

/**
 * Da de alta de una vez a alguien que YA tiene cuenta, con el rol elegido.
 *
 * Es el camino corto frente a la invitación por correo: aquí no hay nada que esperar, así que al
 * terminar se revalida la ruta y la fila aparece con su rol y sus permisos en el siguiente render
 * del servidor.
 *
 * Los rechazos del backend se devuelven tal cual llegan porque son la mitad del valor de esta
 * pantalla: "no existe un usuario con ese correo" le dice al administrador que le toca invitar,
 * y "tiene una membresía dada de baja" que le toca reactivar. Un mensaje genérico lo dejaría
 * probando a ciegas.
 *
 * Igual que la invitación, la organización sale del header `X-Account-Id` y nunca del cuerpo: es
 * lo que impide dar de alta a alguien en una organización ajena aunque se manipule la petición.
 *
 * @param accountId - Membresía del llamador en la organización activa (`activeAccount.id`).
 * @param organizationId - Organización, para revalidar la ruta de la sección al terminar.
 * @param values - Correo, rol y puesto opcional del nuevo miembro.
 * @returns `{ ok: true }`, o el motivo del rechazo cuando el backend lo explica.
 * @throws Nada: los fallos vuelven como resultado para poder mostrarlos.
 *
 * @example
 * ```ts
 * const result = await addOrganizationMemberAction(accountId, organizationId, {
 *   email: 'ana@empresa.com',
 *   roleId,
 * });
 * if (!result.ok) toast.error(result.message);
 * ```
 */
export async function addOrganizationMemberAction(
  accountId: string,
  organizationId: string,
  values: AddOrganizationMemberValues,
): Promise<ActionResult> {
  try {
    await backendRequest<unknown>('organizations/members', {
      method: 'POST',
      body: values,
      accountId,
    });
  } catch (error) {
    return toFailedResult(
      error,
      'Ocurrió un error al agregar al miembro. Intenta de nuevo.',
    );
  }

  revalidatePath(organizationMembersPath(organizationId));
  return { ok: true };
}

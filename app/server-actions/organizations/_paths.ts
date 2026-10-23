/**
 * Ruta de la sección de miembros de una organización.
 *
 * Vive aquí —y no repetida dentro de cada Server Action— porque es la ruta que revalidan TODAS
 * las mutaciones: si la sección se mueve, una sola cadena mal actualizada dejaría al usuario
 * viendo una lista vieja después de invitar o eliminar a alguien, sin ningún error visible que
 * delate la causa.
 *
 * El prefijo `_` mantiene el fichero fuera del enrutador de Next, que ignora las carpetas y
 * ficheros que empiezan así.
 *
 * @param organizationId - Organización cuya sección se quiere nombrar.
 * @returns La ruta absoluta de la sección, lista para `revalidatePath` o para un enlace.
 * @throws Nada: es una función pura sobre una cadena.
 *
 * @example
 * ```ts
 * revalidatePath(organizationMembersPath('org-1'));
 * // '/dashboard/organizations/org-1/members'
 * ```
 */
export function organizationMembersPath(organizationId: string): string {
  return `/dashboard/organizations/${organizationId}/members`;
}

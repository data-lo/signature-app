/**
 * Nombre del rol de sistema que reciben por defecto los miembros nuevos. Es el identificador
 * real del catálogo (`GET /api/v1/roles`), no lo que se muestra: en pantalla sale como
 * `MIEMBRO` (ver `SYSTEM_ROLE_LABELS`).
 */
export const DEFAULT_MEMBER_ROLE_NAME = 'MEMBER';

/**
 * Cómo se nombra en pantalla cada rol de sistema.
 *
 * Los roles viajan con su identificador en inglés (`OWNER`, `ADMIN`, `MEMBER`) porque eso es lo
 * que guarda y compara el backend; la interfaz está en español y mostrarlo crudo obliga a quien
 * administra a traducir nomenclatura interna. Los roles custom de una organización no están
 * aquí: su nombre lo eligió quien los creó y se muestra tal cual.
 */
export const SYSTEM_ROLE_LABELS: Record<string, string> = {
  OWNER: 'PROPIETARIO',
  ADMIN: 'ADMINISTRADOR',
  [DEFAULT_MEMBER_ROLE_NAME]: 'MIEMBRO',
};

/**
 * Etiqueta con la que se muestra un rol: la traducción del rol de sistema, o el nombre tal cual
 * si es un rol custom de la organización.
 *
 * @param roleName - Nombre del rol como lo publica la API, o `undefined` si todavía no hay rol.
 * @returns El texto a pintar; una raya si no hay rol que mostrar.
 *
 * @example
 * ```ts
 * formatRoleName('MEMBER'); // 'MIEMBRO'
 * formatRoleName('Aprobador'); // 'Aprobador'
 * formatRoleName(undefined); // '—'
 * ```
 */
export function formatRoleName(roleName?: string | null): string {
  if (!roleName) return '—';

  return SYSTEM_ROLE_LABELS[roleName] ?? roleName;
}

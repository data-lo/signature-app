import type { PermissionKey } from './authorization.types';

/**
 * Si la lista de permisos efectivos contiene uno concreto.
 *
 * Función pura y sin dependencias de React a propósito: la usan el provider del cliente, el
 * sidebar, los helpers de SSR y las pruebas, y ninguno debería tener que montar nada para
 * responder una pregunta que es una búsqueda en un arreglo.
 *
 * @param permissions - Permisos efectivos de la cuenta activa.
 * @param permission - Capacidad que se exige.
 * @returns `true` si la capacidad está concedida.
 *
 * @example
 * ```ts
 * hasPermission(['BILLING.READ'], 'BILLING.READ'); // true
 * hasPermission(['BILLING.READ'], 'BILLING.MANAGE'); // false
 * ```
 */
export function hasPermission(
  permissions: readonly PermissionKey[],
  permission: PermissionKey,
): boolean {
  return permissions.includes(permission);
}

/**
 * Si se concede AL MENOS UNO de los permisos exigidos.
 *
 * Es la regla de la navegación: una entrada se muestra cuando hay algo que hacer dentro de ella,
 * aunque no se pueda hacer todo.
 *
 * **Una lista de requisitos vacía devuelve `false`, no `true`.** Es lo contrario de lo que hace
 * `Array.prototype.some` por accidente, y es deliberado: "no pedí ningún permiso" no debe
 * comportarse como "puedes pasar". Una entrada de menú sin requisitos declarados es casi siempre
 * un olvido, y fallar cerrado hace que se note.
 *
 * @param permissions - Permisos efectivos de la cuenta activa.
 * @param required - Capacidades que sirven para entrar.
 * @returns `true` si alguna de las exigidas está concedida.
 *
 * @example
 * ```ts
 * hasAnyPermission(['DOCUMENT.READ_OWN'], ['DOCUMENT.READ_OWN', 'DOCUMENT.READ_ORGANIZATION']); // true
 * hasAnyPermission(['DOCUMENT.READ_OWN'], []); // false
 * ```
 */
export function hasAnyPermission(
  permissions: readonly PermissionKey[],
  required: readonly PermissionKey[],
): boolean {
  if (required.length === 0) return false;

  return required.some((permission) => permissions.includes(permission));
}

/**
 * Si se conceden TODOS los permisos exigidos.
 *
 * Para acciones que combinan capacidades: cambiarle el rol a alguien necesita a la vez verlo
 * (`MEMBER.READ`) y editarlo (`MEMBER.UPDATE`).
 *
 * A diferencia de `hasAnyPermission`, una lista vacía devuelve `true`: "no exige nada" y "las
 * exige todas y no hay ninguna" son la misma frase, y aquí el sentido natural de `every` sí
 * coincide con lo que se quiere decir.
 *
 * @param permissions - Permisos efectivos de la cuenta activa.
 * @param required - Capacidades que se exigen todas.
 * @returns `true` si no falta ninguna.
 *
 * @example
 * ```ts
 * hasAllPermissions(['MEMBER.READ'], ['MEMBER.READ', 'MEMBER.UPDATE']); // false
 * ```
 */
export function hasAllPermissions(
  permissions: readonly PermissionKey[],
  required: readonly PermissionKey[],
): boolean {
  return required.every((permission) => permissions.includes(permission));
}

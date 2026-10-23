import { redirect } from 'next/navigation';

import type { AuthorizationContext, PermissionKey } from './authorization.types';
import { getAuthorizationContext } from './get-authorization-context.server';
import { hasAnyPermission } from './permissions';

/** Pantalla a la que se manda a quien no tiene el permiso de la ruta. */
export const UNAUTHORIZED_ROUTE = '/dashboard/unauthorized';

/**
 * Exige un permiso para entrar a una página, durante el render del servidor.
 *
 * Redirige en vez de renderizar la pantalla vacía: quien no puede entrar no debe recibir ni el
 * esqueleto de la página, y un `redirect` desde el servidor evita que el HTML inicial llegue a
 * contener nada de ella.
 *
 * **Esto no protege los datos, protege la navegación.** La página que hay detrás vuelve a pedirle
 * al backend lo que necesita, y es el backend el que responde 403 si no toca. Sirve para que
 * quien pega una URL en la barra reciba una pantalla que le explique algo, en vez de una pantalla
 * rota llena de errores de permisos.
 *
 * @param permission - Capacidad que exige la página.
 * @returns El contexto ya resuelto, para que la página no lo vuelva a pedir.
 *
 * @throws Nunca devuelve si falta el permiso: `redirect` interrumpe el render.
 *
 * @example
 * ```tsx
 * export default async function BillingPage() {
 *   await assertPagePermission('BILLING.READ');
 *   return <BillingView />;
 * }
 * ```
 */
export async function assertPagePermission(
  permission: PermissionKey,
): Promise<AuthorizationContext> {
  return assertPageAnyPermission([permission]);
}

/**
 * Igual que `assertPagePermission`, pero basta con UNA de varias capacidades.
 *
 * Existe porque hay pantallas a las que se llega por más de un camino: el listado de documentos
 * lo abre tanto quien sólo ve los suyos (`DOCUMENT.READ_OWN`) como quien ve los de toda la
 * organización (`DOCUMENT.READ_ORGANIZATION`), y exigir una clave concreta dejaría fuera a la
 * mitad.
 *
 * Una sesión caducada manda a `/login` y no a la pantalla de acceso denegado: no es que no le
 * toque, es que ya no sabemos quién es.
 *
 * @param permissions - Capacidades que sirven para entrar.
 * @returns El contexto ya resuelto.
 *
 * @throws Nunca devuelve si no hay ninguna: `redirect` interrumpe el render.
 *
 * @example
 * ```tsx
 * await assertPageAnyPermission(['DOCUMENT.READ_OWN', 'DOCUMENT.READ_ORGANIZATION']);
 * ```
 */
export async function assertPageAnyPermission(
  permissions: readonly PermissionKey[],
): Promise<AuthorizationContext> {
  const result = await getAuthorizationContext();

  if (!result.ok) {
    redirect(result.failure === 'UNAUTHENTICATED' ? '/login' : UNAUTHORIZED_ROUTE);
  }

  if (!hasAnyPermission(result.context.permissions, permissions)) {
    redirect(UNAUTHORIZED_ROUTE);
  }

  return result.context;
}

import type { BillingAccess } from '@/lib/api/billing';
import type { AccountKind } from '@/lib/store/types/auth-store.types';

/** Pantalla a la que se manda a una organización sin plan: donde puede contratarlo. */
export const PLANS_ROUTE = '/dashboard/plans';

/**
 * Pantallas que una organización sin plan SÍ puede abrir.
 *
 * **Planes y Suscripciones** son las que le permiten contratar y ver en qué quedó el pago. **Crear
 * organización** también, aunque no sea una pantalla de pagos: crear organizaciones está disponible
 * para cualquier usuario, y sin esta excepción quien está parado en una organización sin plan
 * pulsaría "Crear organización" en el selector de cuentas y rebotaría a Planes.
 *
 * **Permisos** entra por lo mismo que miembros (ver `ROUTE_PATTERNS_AVAILABLE_WITHOUT_PLAN`):
 * administrar la organización no es usarla.
 */
export const ROUTES_AVAILABLE_WITHOUT_PLAN = [
  PLANS_ROUTE,
  '/dashboard/subscriptions',
  '/dashboard/organization/create',
  '/dashboard/organization/settings/permissions',
] as const;

/**
 * Lo mismo, para las rutas que llevan un identificador y no se pueden escribir como texto fijo.
 *
 * Por ahora sólo Administrar miembros, cuya ruta lleva el `organizationId`. Quien acaba de crear
 * una organización queda como su administrador en el mismo momento del alta, así que la pantalla
 * donde ejerce ese rol —invitar al equipo, repartir permisos— tiene que estar disponible desde el
 * primer segundo, antes de contratar nada. Lo que el plan habilita es OPERAR la organización
 * (documentos y firmas), no administrarla; el backend nunca puso el plan de por medio para
 * gestionar miembros ni permisos, sólo `assertHasOrganizationPermission`.
 */
export const ROUTE_PATTERNS_AVAILABLE_WITHOUT_PLAN = [
  /^\/dashboard\/organizations\/[^/]+\/members$/,
] as const;

/**
 * Indica si una ruta del dashboard se puede abrir aunque la organización activa no tenga plan.
 *
 * Compara por segmentos completos y no con un `startsWith` a secas, para que `/dashboard/plansX`
 * no cuente como `/dashboard/plans`.
 *
 * @param pathname - Ruta actual, tal como la devuelve `usePathname()`.
 * @returns `true` si es Planes, Suscripciones, Crear organización, la administración de la
 *   organización (miembros y permisos) o una subruta de ellas.
 *
 * @example
 * ```ts
 * isRouteAvailableWithoutPlan('/dashboard/plans'); // true
 * isRouteAvailableWithoutPlan('/dashboard/organizations/org-1/members'); // true
 * isRouteAvailableWithoutPlan('/dashboard/documents/create'); // false
 * ```
 */
export function isRouteAvailableWithoutPlan(pathname: string): boolean {
  return (
    ROUTES_AVAILABLE_WITHOUT_PLAN.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`),
    ) ||
    ROUTE_PATTERNS_AVAILABLE_WITHOUT_PLAN.some((pattern) =>
      pattern.test(pathname),
    )
  );
}

/**
 * Indica si la cuenta activa es una organización que todavía no ha contratado ningún plan.
 *
 * **Se exige no tener plan (`currentPlanType === null`), no sólo no tener suscripción activa.** Las
 * organizaciones que ya existían nacieron con perfil Free y responden `hasActiveSubscription: false`
 * con plan `free`: si bastara con la suscripción, esta regla les quitaría de golpe el acceso que hoy
 * tienen. Una organización nueva, en cambio, nace sin `billing_profile` y el backend le responde sin
 * plan y con todas las acciones en `false`.
 *
 * Una cuenta personal nunca queda bloqueada por esta regla: sin perfil, el backend le responde el
 * plan gratuito, que es con lo que nace.
 *
 * @param accountType - Tipo de la cuenta activa.
 * @param billing - Estado comercial de esa cuenta, ya consultado.
 * @returns `true` si hay que bloquear las rutas operativas y mandar a Planes.
 *
 * @example
 * ```ts
 * isOrganizationWithoutPlan('ORGANIZATION', { ...billing, currentPlanType: null }); // true
 * isOrganizationWithoutPlan('PERSONAL', { ...billing, currentPlanType: null }); // false
 * ```
 */
export function isOrganizationWithoutPlan(
  accountType: AccountKind,
  billing: BillingAccess,
): boolean {
  return (
    accountType === 'ORGANIZATION' &&
    !billing.hasActiveSubscription &&
    billing.currentPlanType === null
  );
}

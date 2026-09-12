'use client';

import { useBillingAccess } from '@/lib/hooks/useBillingAccess';
import { isOrganizationWithoutPlan } from '@/lib/billing/organization-plan-access';
import { useAuthStore } from '@/lib/store/useAuthStore';

/**
 * En qué punto está el acceso de la cuenta activa a las rutas operativas.
 *
 * - `loading`: todavía no se sabe —no hay cuenta activa o su estado comercial no ha llegado—.
 * - `locked`: es una organización sin plan; sólo puede abrir Planes y Suscripciones.
 * - `unlocked`: puede abrir las rutas, y cada acción la sigue decidiendo `actions`.
 */
export type OrganizationPlanAccess = 'loading' | 'locked' | 'unlocked';

/**
 * Decide si la cuenta activa puede abrir las rutas operativas del dashboard, según su plan.
 *
 * Lee la MISMA consulta que `AuthProvider` (`['billingAccess', accountId]`), así que cambiar de
 * cuenta cambia la llave y el acceso vuelve a `loading` hasta que llega la respuesta de la cuenta
 * nueva: nunca se decide con el estado de la cuenta anterior.
 *
 * **Si la consulta falla, se deja pasar (`unlocked`).** No hay un estado bueno que mostrar, y
 * bloquear toda la aplicación porque el endpoint de facturación no respondió castigaría a todas las
 * cuentas por igual. No abre nada que no deba: cada acción protegida se vuelve a autorizar en el
 * backend, que a una organización sin plan le responde todas las acciones en `false`.
 *
 * @returns `loading`, `locked` o `unlocked`.
 *
 * @example
 * ```tsx
 * const access = useOrganizationPlanAccess();
 * if (access === 'locked') router.replace(PLANS_ROUTE);
 * ```
 */
export function useOrganizationPlanAccess(): OrganizationPlanAccess {
  const accountType = useAuthStore((state) => state.activeAccount?.accountType);
  const { data, isPending, isError } = useBillingAccess();

  if (!accountType) {
    return 'loading';
  }

  if (isError) {
    return 'unlocked';
  }

  if (isPending || !data) {
    return 'loading';
  }

  return isOrganizationWithoutPlan(accountType, data) ? 'locked' : 'unlocked';
}

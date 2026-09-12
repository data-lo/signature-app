'use client';

import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import {
  PLANS_ROUTE,
  isRouteAvailableWithoutPlan,
} from '@/lib/billing/organization-plan-access';
import { useOrganizationPlanAccess } from '@/lib/hooks/useOrganizationPlanAccess';

/**
 * Lo que se le dice a quien está en una organización que todavía no contrata un plan.
 *
 * Ya no menciona la configuración de la organización: administrarla —miembros y permisos— no
 * depende del plan, así que prometer que el plan la habilita contradice lo que la persona tiene
 * delante en el menú.
 */
export const ORGANIZATION_WITHOUT_PLAN_MESSAGE =
  'Esta organización todavía no tiene un plan. Contrata uno para habilitar documentos y firmas; mientras tanto puedes administrar a sus miembros y sus permisos.';

/**
 * Aviso de organización sin plan, sobre Planes y Suscripciones.
 *
 * @returns El aviso, con un enlace a Planes.
 *
 * @example
 * ```tsx
 * <OrganizationWithoutPlanNotice />
 * ```
 */
function OrganizationWithoutPlanNotice() {
  return (
    <div className="px-4 pt-4 md:px-8">
      <p
        role="status"
        className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-foreground"
      >
        {ORGANIZATION_WITHOUT_PLAN_MESSAGE}{' '}
        <Link href={PLANS_ROUTE} className="font-medium underline">
          Ver planes
        </Link>
      </p>
    </div>
  );
}

/**
 * Estado de espera mientras se sabe si la cuenta activa puede abrir la ruta.
 *
 * @returns Un indicador de carga accesible, sin nada del contenido protegido.
 *
 * @example
 * ```tsx
 * <PlanAccessLoader />
 * ```
 */
function PlanAccessLoader() {
  return (
    <div
      role="status"
      aria-label="Verificando el plan de la cuenta"
      className="flex flex-1 items-center justify-center p-8 text-muted-foreground"
    >
      <Loader2 className="size-5 animate-spin" aria-hidden />
    </div>
  );
}

/**
 * Protege las rutas operativas del dashboard hasta que la organización activa contrate un plan.
 *
 * Tres casos:
 *
 * - **Planes, Suscripciones, Crear organización y la administración de la organización**
 *   (miembros y permisos) se muestran siempre; si la cuenta es una organización sin plan, con un
 *   aviso encima que explica qué le falta por habilitar.
 * - **Cualquier otra ruta** espera a conocer el estado comercial de la cuenta activa y, mientras
 *   tanto, no muestra su contenido: pintarlo para esconderlo medio segundo después dejaría ver —y
 *   pulsar— lo que no se puede usar.
 * - **Una organización sin plan** que intenta abrir una ruta operativa —documentos y firmas, lo
 *   que se paga— se manda a Planes.
 *
 * Cambiar de cuenta en el selector resetea el estado comercial de la cuenta destino (ver
 * `useSwitchActiveAccount`), así que esta guarda vuelve a esperar y decide con la respuesta nueva:
 * pasar de una organización sin plan a la cuenta personal restaura los accesos de su plan.
 *
 * Es experiencia de usuario, no autorización: el backend responde a una organización sin plan todas
 * las acciones en `false` y las vuelve a comprobar en cada endpoint protegido.
 *
 * @param props.children - Contenido de la ruta.
 * @returns El contenido, un indicador de carga o nada mientras se redirige.
 *
 * @example
 * ```tsx
 * <OrganizationPlanGuard>{children}</OrganizationPlanGuard>
 * ```
 */
export default function OrganizationPlanGuard({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const access = useOrganizationPlanAccess();
  const routeAvailableWithoutPlan = isRouteAvailableWithoutPlan(pathname);

  useEffect(() => {
    if (access === 'locked' && !routeAvailableWithoutPlan) {
      router.replace(PLANS_ROUTE);
    }
  }, [access, routeAvailableWithoutPlan, router]);

  if (routeAvailableWithoutPlan) {
    return (
      <>
        {access === 'locked' ? <OrganizationWithoutPlanNotice /> : null}
        {children}
      </>
    );
  }

  if (access !== 'unlocked') {
    return <PlanAccessLoader />;
  }

  return <>{children}</>;
}

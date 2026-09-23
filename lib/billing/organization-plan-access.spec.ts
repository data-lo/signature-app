import {
  ORGANIZATION_WITHOUT_PLAN,
  SIN_PERFIL,
  buildBillingAccess,
} from '@/lib/api/billing.fixtures';
import {
  isOrganizationWithoutPlan,
  isRouteAvailableWithoutPlan,
} from './organization-plan-access';

describe('isRouteAvailableWithoutPlan', () => {
  it.each([
    '/dashboard/plans',
    '/dashboard/subscriptions',
    '/dashboard/organization/create',
  ])('deja abrir %s a una organización sin plan', (pathname) => {
    expect(isRouteAvailableWithoutPlan(pathname)).toBe(true);
  });

  /**
   * La sección Organización queda fuera: una organización sin plan no tiene más sección que
   * Pagos, ni en el menú ni escribiendo la URL. Estas rutas estuvieron permitidas —con el
   * argumento de que administrar no es usar—; la prueba fija la regla nueva.
   */
  it.each([
    '/dashboard/organizations/org-1/members',
    '/dashboard/organization/settings/roles',
    '/dashboard/organization/settings/permissions',
  ])('bloquea la administración de la organización en %s', (pathname) => {
    expect(isRouteAvailableWithoutPlan(pathname)).toBe(false);
  });

  it.each([
    '/dashboard',
    '/dashboard/documents',
    '/dashboard/documents/create',
    '/dashboard/documents/doc-1',
    '/dashboard/organizations',
    '/dashboard/organizations/org-1',
    '/dashboard/personal-documents',
    '/dashboard/personal-documents/identity',
  ])('bloquea la ruta operativa %s', (pathname) => {
    expect(isRouteAvailableWithoutPlan(pathname)).toBe(false);
  });

  /**
   * `/dashboard/organization/create` sí pasa, y sus vecinas de `/dashboard/organization` no: la
   * comparación es por segmentos, así que permitir el alta no abre la configuración entera.
   */
  it('permitir Crear organización no abre el resto de /dashboard/organization', () => {
    expect(isRouteAvailableWithoutPlan('/dashboard/organization/create')).toBe(
      true,
    );
    expect(isRouteAvailableWithoutPlan('/dashboard/organization')).toBe(false);
    expect(
      isRouteAvailableWithoutPlan('/dashboard/organization/settings'),
    ).toBe(false);
  });

  /** Compara por segmentos: un prefijo parecido no es la misma ruta. */
  it('no confunde una ruta que sólo empieza igual', () => {
    expect(isRouteAvailableWithoutPlan('/dashboard/plansX')).toBe(false);
  });
});

describe('isOrganizationWithoutPlan', () => {
  it('bloquea a una organización sin perfil ni plan', () => {
    expect(
      isOrganizationWithoutPlan('ORGANIZATION', ORGANIZATION_WITHOUT_PLAN),
    ).toBe(true);
  });

  it('bloquea a una organización cuyo perfil se abrió en un Checkout que nunca se pagó', () => {
    expect(
      isOrganizationWithoutPlan('ORGANIZATION', {
        ...ORGANIZATION_WITHOUT_PLAN,
        billingProfileId: 'perfil-1',
        status: 'INCOMPLETE',
      }),
    ).toBe(true);
  });

  it('no bloquea a una organización con suscripción activa', () => {
    expect(
      isOrganizationWithoutPlan(
        'ORGANIZATION',
        buildBillingAccess({ currentPlanType: 'plus' }),
      ),
    ).toBe(false);
  });

  /** Las organizaciones que ya existían nacieron en Free y conservan su acceso. */
  it('no bloquea a una organización Free existente', () => {
    expect(
      isOrganizationWithoutPlan(
        'ORGANIZATION',
        buildBillingAccess({
          currentPlanType: 'free',
          status: 'FREE',
          hasActiveSubscription: false,
        }),
      ),
    ).toBe(false);
  });

  it('no bloquea a una cuenta personal sin perfil', () => {
    expect(isOrganizationWithoutPlan('PERSONAL', SIN_PERFIL)).toBe(false);
  });
});

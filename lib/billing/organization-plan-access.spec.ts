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

  it.each([
    '/dashboard',
    '/dashboard/documents',
    '/dashboard/documents/create',
    '/dashboard/documents/doc-1',
    '/dashboard/organization/settings/members',
    '/dashboard/organization/settings/permissions',
    '/dashboard/personal-documents',
    '/dashboard/personal-documents/identity',
  ])('bloquea la ruta operativa %s', (pathname) => {
    expect(isRouteAvailableWithoutPlan(pathname)).toBe(false);
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

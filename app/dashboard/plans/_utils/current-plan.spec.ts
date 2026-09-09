import { buildBillingAccess } from '@/lib/api/billing.fixtures';
import type { PaymentService } from '../_interfaces/payment-service.interface';
import { isCurrentPlan, isSubscriptionPlan } from './current-plan';

function servicio(overrides: Partial<PaymentService> = {}): PaymentService {
  return {
    priceId: 'price_1',
    planType: 'premium',
    name: 'Plan Premium',
    description: null,
    unitAmount: 99900,
    currency: 'mxn',
    interval: 'month',
    intervalCount: 1,
    imageUrl: null,
    ...overrides,
  };
}

describe('isSubscriptionPlan', () => {
  it('un precio recurrente es un plan', () => {
    expect(isSubscriptionPlan(servicio({ interval: 'month' }))).toBe(true);
  });

  /** Lo que distingue un paquete de créditos de un plan, y lo que nunca se bloquea. */
  it('un pago único no lo es', () => {
    expect(
      isSubscriptionPlan(servicio({ interval: null, intervalCount: null })),
    ).toBe(false);
  });
});

describe('isCurrentPlan', () => {
  it('reconoce la tarjeta del plan contratado', () => {
    expect(
      isCurrentPlan(
        servicio({ planType: 'premium' }),
        buildBillingAccess({ currentPlanType: 'premium' }),
      ),
    ).toBe(true);
  });

  it('no confunde un plan con otro', () => {
    expect(
      isCurrentPlan(
        servicio({ planType: 'pro' }),
        buildBillingAccess({ currentPlanType: 'premium' }),
      ),
    ).toBe(false);
  });

  /**
   * `planType` lo escribe una persona en el dashboard de Stripe y `currentPlanType` sale de la
   * tabla `plans`: un `Premium` y un `premium` son el mismo plan, y leerlos como distintos
   * dejaría al usuario sin saber cuál de las tarjetas es la suya.
   */
  it('ignora mayúsculas y espacios sobrantes de la metadata', () => {
    expect(
      isCurrentPlan(
        servicio({ planType: '  Premium ' }),
        buildBillingAccess({ currentPlanType: 'premium' }),
      ),
    ).toBe(true);
  });

  /**
   * La trampa: sin la guarda explícita, `undefined === undefined` daría `true` y el badge "Plan
   * actual" aparecería en TODAS las tarjetas de una cuenta sin plan.
   */
  it('no empareja dos ausencias', () => {
    expect(
      isCurrentPlan(
        servicio({ planType: null }),
        buildBillingAccess({ currentPlanType: null }),
      ),
    ).toBe(false);
  });

  it('un producto sin metadata nunca es el plan actual', () => {
    expect(
      isCurrentPlan(
        servicio({ planType: null }),
        buildBillingAccess({ currentPlanType: 'premium' }),
      ),
    ).toBe(false);
  });

  /** Mientras el estado no se conoce, ninguna tarjeta puede afirmar ser la contratada. */
  it('sin estado de facturación no marca ninguna', () => {
    expect(isCurrentPlan(servicio(), undefined)).toBe(false);
  });
});

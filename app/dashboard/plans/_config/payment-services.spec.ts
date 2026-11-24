import { formatPlanCadence } from './payment-services';

describe('formatPlanCadence', () => {
  it.each([
    ['month', 1, 'Plan mensual'],
    ['month', null, 'Plan mensual'],
    ['year', 1, 'Plan anual'],
    ['week', 1, 'Plan semanal'],
    ['day', 1, 'Plan diario'],
    ['month', 3, 'Plan cada 3 meses'],
    ['year', 2, 'Plan cada 2 años'],
    ['fortnight', 1, 'Plan cada 1 fortnight'],
  ])('rotula %s × %s como "%s"', (interval, count, label) => {
    expect(formatPlanCadence(interval, count)).toBe(label);
  });

  it('sin recurrencia es un pago único', () => {
    expect(formatPlanCadence(null, null)).toBe('Pago único');
  });
});

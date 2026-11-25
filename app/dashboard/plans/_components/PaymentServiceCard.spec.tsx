import { screen, within } from '@testing-library/react';
import { renderWithProviders } from '@/test-utils';
import type { PaymentService } from '../_interfaces/payment-service.interface';
import PaymentServiceCard from './PaymentServiceCard';

const PLAN: PaymentService = {
  priceId: 'price_plus',
  planType: 'plus',
  name: 'Plan Plus',
  description: null,
  unitAmount: 29900,
  currency: 'mxn',
  interval: 'month',
  intervalCount: 1,
  imageUrl: null,
  descriptions: [
    'Hasta 10 documentos',
    'Firma electrónica',
    'Soporte por correo',
  ],
};

/**
 * Monta una tarjeta del catálogo con permisos de lectura.
 *
 * @param service - Servicio a pintar.
 * @returns El resultado del render.
 *
 * @example
 * renderCard({ ...PLAN, descriptions: [] });
 */
function renderCard(service: PaymentService) {
  return renderWithProviders(
    <PaymentServiceCard
      service={service}
      isSubmitting={false}
      isAnySubmitting={false}
      onBuy={jest.fn()}
    />,
    { permissions: ['BILLING.READ'] },
  );
}

describe('PaymentServiceCard — descripciones', () => {
  it('pinta cada descripción en su propio renglón, en el orden configurado', () => {
    renderCard(PLAN);

    const list = screen.getByRole('list', { name: 'Incluye' });
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      'Hasta 10 documentos',
      'Firma electrónica',
      'Soporte por correo',
    ]);
  });

  it('no pinta la lista cuando el plan no tiene descripciones', () => {
    renderCard({ ...PLAN, descriptions: [] });

    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('tolera un backend que todavía no manda el campo', () => {
    const { descriptions: _omitted, ...legacy } = PLAN;
    void _omitted;

    renderCard(legacy);

    expect(screen.getByText('Plan Plus')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});

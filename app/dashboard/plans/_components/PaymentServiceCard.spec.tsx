import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test-utils';
import type { PermissionKey } from '@/lib/authorization/authorization.types';
import type { PaymentService } from '../_interfaces/payment-service.interface';
import PaymentServiceCard from './PaymentServiceCard';

const PLAN: PaymentService = {
  priceId: 'price_plus',
  planType: 'plus',
  name: 'Plan Plus',
  description:
    'Para profesionales independientes y equipos pequeños con un flujo constante de documentos.',
  unitAmount: 44900,
  currency: 'mxn',
  interval: 'month',
  intervalCount: 1,
  imageUrl: null,
  descriptions: [
    '25 documentos incluidos al mes',
    '$32 MXN por documento adicional',
    'Firma masiva por lotes',
    'Cuenta para equipos',
    'Soporte por correo y mensajería',
  ],
};

/**
 * Monta una tarjeta del catálogo.
 *
 * @param service - Servicio a pintar.
 * @param options.permissions - Permisos de la cuenta; por defecto puede comprar.
 * @param options.onBuy - Callback de compra.
 * @returns El resultado del render.
 *
 * @example
 * renderCard({ ...PLAN, descriptions: [] });
 */
function renderCard(
  service: PaymentService,
  {
    permissions = ['BILLING.READ', 'BILLING.MANAGE'],
    onBuy = jest.fn(),
  }: { permissions?: PermissionKey[]; onBuy?: jest.Mock } = {},
) {
  return renderWithProviders(
    <PaymentServiceCard
      service={service}
      isSubmitting={false}
      isAnySubmitting={false}
      onBuy={onBuy}
    />,
    { permissions },
  );
}

/** Textos de los beneficios de la tarjeta, en el orden en que se pintan. */
function benefitTexts(): (string | null)[] {
  return within(screen.getByRole('list', { name: 'Incluye' }))
    .getAllByRole('listitem')
    .map((item) => item.textContent);
}

describe('PaymentServiceCard — beneficios', () => {
  it('pinta un <li> por descripción, en el orden recibido del backend', () => {
    renderCard(PLAN);

    expect(
      screen.getByRole('heading', { level: 3, name: 'Incluye' }),
    ).toBeInTheDocument();
    expect(benefitTexts()).toEqual(PLAN.descriptions);
  });

  it('no reordena: invertir el arreglo invierte la lista', () => {
    renderCard({ ...PLAN, descriptions: [...PLAN.descriptions!].reverse() });

    expect(benefitTexts()).toEqual([...PLAN.descriptions!].reverse());
  });

  it('el ícono de verificación es decorativo', () => {
    renderCard(PLAN);

    const items = within(
      screen.getByRole('list', { name: 'Incluye' }),
    ).getAllByRole('listitem');
    for (const item of items) {
      expect(item.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it('oculta "Incluye" cuando el arreglo está vacío', () => {
    renderCard({ ...PLAN, descriptions: [] });

    expect(screen.queryByText('Incluye')).not.toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('tolera un backend que todavía no manda el campo', () => {
    const { descriptions: _omitted, ...legacy } = PLAN;
    void _omitted;

    renderCard(legacy);

    expect(screen.getByRole('heading', { name: 'Plan Plus' })).toBeVisible();
    expect(screen.queryByText('Incluye')).not.toBeInTheDocument();
  });
});

describe('PaymentServiceCard — estructura', () => {
  it('muestra periodicidad, nombre, descripción breve y precio', () => {
    renderCard(PLAN);

    expect(screen.getByText('Plan mensual')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Plan Plus' }),
    ).toBeInTheDocument();
    expect(screen.getByText(PLAN.description!)).toBeInTheDocument();
    expect(screen.getByText('al mes')).toBeInTheDocument();
  });

  /**
   * jsdom no calcula layout, así que la alineación se fija por estructura: la tarjeta es un
   * subgrid de 4 filas con SIEMPRE cuatro bloques en el mismo orden, tenga uno o muchos
   * beneficios, descripción larga o ninguna. Con eso el grid alinea precio y botón entre
   * tarjetas.
   */
  it.each([
    ['sin beneficios ni descripción', { descriptions: [], description: null }],
    ['con un beneficio', { descriptions: ['Firma electrónica'] }],
    [
      'con diez beneficios y descripción larga',
      {
        descriptions: Array.from({ length: 10 }, (_, i) => `Beneficio ${i}`),
        description: 'Texto largo. '.repeat(30),
      },
    ],
  ])(
    'conserva los cuatro bloques alineables %s',
    (_, overrides: Partial<PaymentService>) => {
      renderCard({ ...PLAN, ...overrides });

      const card = screen.getByTestId('payment-service-card');
      expect(card).toHaveClass('row-span-4', 'grid-rows-subgrid');
      const [header, price, benefits, footer] = Array.from(card.children);
      expect(card.children).toHaveLength(4);
      expect(header.tagName).toBe('HEADER');
      expect(price).toHaveTextContent('al mes');
      expect(benefits.querySelectorAll('li')).toHaveLength(
        overrides.descriptions?.length ?? 0,
      );
      expect(
        within(footer as HTMLElement).getByRole('button', {
          name: 'Comprar plan',
        }),
      ).toBeInTheDocument();
    },
  );

  it('sin BILLING.MANAGE conserva la fila de compra vacía', () => {
    renderCard(PLAN, { permissions: ['BILLING.READ'] });

    const card = screen.getByTestId('payment-service-card');
    expect(card.children).toHaveLength(4);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('un pago único se rotula como tal y su botón dice sólo "Comprar"', () => {
    renderCard({ ...PLAN, interval: null, intervalCount: null });

    expect(screen.getByText('Pago único')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Comprar' })).toBeInTheDocument();
  });

  it('se compra con el teclado, con el mismo priceId de siempre', async () => {
    const user = userEvent.setup();
    const onBuy = jest.fn();
    renderCard(PLAN, { onBuy });

    await user.tab();
    expect(screen.getByRole('button', { name: 'Comprar plan' })).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(onBuy).toHaveBeenCalledWith('price_plus');
  });
});

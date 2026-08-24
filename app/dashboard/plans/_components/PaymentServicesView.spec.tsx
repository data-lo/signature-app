import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test-utils';
import {
  getPaymentServicesRequest,
  createCheckoutSessionRequest,
} from '../_requests';
import type { PaymentService } from '../_interfaces/payment-service.interface';
import PaymentServicesView from './PaymentServicesView';

jest.mock('../_requests');

const mockedGetServices = getPaymentServicesRequest as jest.Mock;
const mockedCreateSession = createCheckoutSessionRequest as jest.Mock;

const CHECKOUT_URL = 'https://checkout.stripe.com/c/pay/cs_test_123';

const MENSUAL: PaymentService = {
  priceId: 'price_mensual',
  name: 'Plan Pro',
  description: 'Firma ilimitada',
  unitAmount: 49900,
  currency: 'mxn',
  interval: 'month',
  intervalCount: 1,
  imageUrl: null,
};

const UNICO: PaymentService = {
  priceId: 'price_unico',
  name: 'Paquete de sellos',
  description: null,
  unitAmount: 25000,
  currency: 'mxn',
  interval: null,
  intervalCount: null,
  imageUrl: null,
};


describe('PaymentServicesView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetServices.mockResolvedValue([MENSUAL, UNICO]);
    mockedCreateSession.mockResolvedValue({ checkoutUrl: CHECKOUT_URL });
  });

  it('pinta una tarjeta por servicio con su importe y periodicidad', async () => {
    renderWithProviders(<PaymentServicesView />);

    expect(await screen.findByText('Plan Pro')).toBeInTheDocument();
    expect(screen.getByText('al mes')).toBeInTheDocument();
    expect(screen.getByText('Paquete de sellos')).toBeInTheDocument();
    // Un pago único no lleva periodicidad: el importe se entiende solo.
    expect(screen.queryByText(/cada|al mes|al año/)).toHaveTextContent(
      'al mes',
    );
  });

  /** La regla central del ticket. */
  it('no pide ninguna sesión de Checkout al cargar el catálogo', async () => {
    renderWithProviders(<PaymentServicesView />);

    await screen.findByText('Plan Pro');

    expect(mockedCreateSession).not.toHaveBeenCalled();
  });

  /**
   * La redirección en sí (`window.location.assign`) no se afirma: jsdom declara
   * `window.location` no configurable y su `assign` de sólo lectura, así que no hay forma de
   * interceptarla sin abrir un hueco en el código de producción. Lo que sí se fija acá es el
   * contrato que la precede — que la sesión se pida, y con el precio de la tarjeta pulsada.
   */
  it('crea la sesión sólo al pulsar Comprar, con el precio de esa tarjeta', async () => {
    renderWithProviders(<PaymentServicesView />);

    const botones = await screen.findAllByRole('button', { name: /comprar/i });
    await userEvent.click(botones[0]);

    await waitFor(() => expect(mockedCreateSession).toHaveBeenCalledTimes(1));
    // react-query pasa un segundo argumento de contexto al mutationFn; sólo importa el precio.
    expect(mockedCreateSession.mock.calls[0][0]).toBe('price_mensual');
  });

  it('bloquea el resto de las tarjetas mientras se abre una compra', async () => {
    // La promesa se deja pendiente para observar el estado intermedio.
    mockedCreateSession.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<PaymentServicesView />);

    const botones = await screen.findAllByRole('button', { name: /comprar/i });
    await userEvent.click(botones[0]);

    await waitFor(() =>
      expect(screen.getByText(/redirigiendo a stripe/i)).toBeInTheDocument(),
    );
    for (const boton of screen.getAllByRole('button')) {
      expect(boton).toBeDisabled();
    }
  });

  it('un catálogo vacío se explica, no se deja en blanco', async () => {
    mockedGetServices.mockResolvedValue([]);

    renderWithProviders(<PaymentServicesView />);

    expect(
      await screen.findByText(/todavía no hay servicios disponibles/i),
    ).toBeInTheDocument();
  });

  it('muestra el esqueleto mientras carga, sin tarjetas parciales', () => {
    mockedGetServices.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<PaymentServicesView />);

    expect(screen.getByLabelText(/cargando servicios/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /comprar/i }),
    ).not.toBeInTheDocument();
  });
});

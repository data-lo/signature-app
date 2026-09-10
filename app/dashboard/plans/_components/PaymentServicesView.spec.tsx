import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test-utils';
import {
  getPaymentServicesRequest,
  createCheckoutSessionRequest,
} from '../_requests';
import { getBillingAccessRequest } from '@/lib/api/billing';
import { buildBillingAccess } from '@/lib/api/billing.fixtures';
import { useAuthStore } from '@/lib/store/useAuthStore';
import type { PaymentService } from '../_interfaces/payment-service.interface';
import PaymentServicesView from './PaymentServicesView';

jest.mock('../_requests');
jest.mock('@/lib/api/billing');

const mockedGetServices = getPaymentServicesRequest as jest.Mock;
const mockedCreateSession = createCheckoutSessionRequest as jest.Mock;
const mockedGetBilling = getBillingAccessRequest as jest.Mock;

const CHECKOUT_URL = 'https://checkout.stripe.com/c/pay/cs_test_123';

const MENSUAL: PaymentService = {
  priceId: 'price_mensual',
  planType: 'pro',
  name: 'Plan Pro',
  description: 'Firma ilimitada',
  unitAmount: 49900,
  currency: 'mxn',
  interval: 'month',
  intervalCount: 1,
  imageUrl: null,
};

/** El otro plan del catálogo: es al que NO debe dejarse saltar teniendo Pro contratado. */
const PREMIUM: PaymentService = {
  priceId: 'price_premium',
  planType: 'premium',
  name: 'Plan Premium',
  description: null,
  unitAmount: 99900,
  currency: 'mxn',
  interval: 'month',
  intervalCount: 1,
  imageUrl: null,
};

const UNICO: PaymentService = {
  priceId: 'price_unico',
  planType: null,
  name: 'Paquete de sellos',
  description: null,
  unitAmount: 25000,
  currency: 'mxn',
  interval: null,
  intervalCount: null,
  imageUrl: null,
};

/**
 * El bloqueo depende de la cuenta ACTIVA, no del usuario: la consulta de facturación lleva su id
 * en la `queryKey` y sin cuenta activa ni siquiera se dispara.
 */
function givenActiveAccount(id = 'cuenta-1') {
  useAuthStore.setState({
    activeAccount: {
      id,
      accountType: 'PERSONAL',
      organizationId: null,
      roleId: null,
    },
  });
}

function givenBilling(state: Parameters<typeof buildBillingAccess>[0]) {
  mockedGetBilling.mockResolvedValue(buildBillingAccess(state));
}


describe('PaymentServicesView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ activeAccount: null });
    mockedGetServices.mockResolvedValue([MENSUAL, UNICO]);
    mockedCreateSession.mockResolvedValue({ checkoutUrl: CHECKOUT_URL });
    mockedGetBilling.mockResolvedValue(buildBillingAccess({}));
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

  /**
   * La regla de esta historia. El backend rechaza con 409 cualquier checkout de suscripción sobre
   * un perfil ACTIVE, así que ofrecer el botón sería mandar al usuario a Stripe para que vuelva
   * con un error.
   */
  describe('con una suscripción activa', () => {
    beforeEach(() => {
      mockedGetServices.mockResolvedValue([MENSUAL, PREMIUM, UNICO]);
      givenActiveAccount();
      givenBilling({ hasActiveSubscription: true, currentPlanType: 'pro' });
    });

    it('marca con el badge "Plan actual" la tarjeta del plan contratado', async () => {
      renderWithProviders(<PaymentServicesView />);

      expect(await screen.findByText('Plan actual')).toBeInTheDocument();
    });

    /** Uno y sólo uno: el badge en dos tarjetas no diría nada. */
    it('no marca ninguna otra tarjeta como plan actual', async () => {
      renderWithProviders(<PaymentServicesView />);

      await screen.findByText('Plan actual');

      expect(screen.getAllByText('Plan actual')).toHaveLength(1);
    });

    it('deshabilita la contratación de los demás planes', async () => {
      renderWithProviders(<PaymentServicesView />);

      await screen.findByText('Plan actual');

      const botones = screen.getAllByRole('button', { name: /comprar/i });
      const dePlanes = botones.filter(
        (boton) => boton.getAttribute('aria-disabled') === 'true',
      );
      // Los dos planes (el contratado y el otro); el paquete suelto queda fuera.
      expect(dePlanes).toHaveLength(2);
    });

    /**
     * El plan contratado también: el backend lo rechaza con el mismo 409, y volver a ofrecer
     * "Comprar" en la tarjeta que ya lleva el badge invitaría a pagar dos veces por lo mismo.
     */
    it('tampoco deja volver a contratar el plan que ya se tiene', async () => {
      renderWithProviders(<PaymentServicesView />);

      await screen.findByText('Plan actual');

      await userEvent.click(
        screen.getAllByRole('button', { name: /comprar/i })[0],
      );

      expect(mockedCreateSession).not.toHaveBeenCalled();
    });

    it('un clic en un plan bloqueado no abre ninguna sesión de Checkout', async () => {
      renderWithProviders(<PaymentServicesView />);

      await screen.findByText('Plan actual');

      const premium = screen
        .getAllByRole('button', { name: /comprar/i })
        .find(
          (boton) => boton.getAttribute('aria-disabled') === 'true',
        ) as HTMLElement;
      await userEvent.click(premium);

      expect(mockedCreateSession).not.toHaveBeenCalled();
    });

    it('explica por qué no se puede contratar al interactuar con el botón', async () => {
      renderWithProviders(<PaymentServicesView />);

      await screen.findByText('Plan actual');

      const bloqueado = screen
        .getAllByRole('button', { name: /comprar/i })
        .find(
          (boton) => boton.getAttribute('aria-disabled') === 'true',
        ) as HTMLElement;
      await userEvent.hover(bloqueado);

      expect(
        await screen.findByText('Tienes un plan activo'),
      ).toBeInTheDocument();
    });

    /**
     * El punto 6 del ticket. Tener plan no es motivo para no dejar comprar más documentos — es
     * justamente lo contrario, y bloquearlo cortaría una venta que el backend sí acepta.
     */
    it('NO bloquea la compra de créditos de documentos', async () => {
      renderWithProviders(<PaymentServicesView />);

      await screen.findByText('Plan actual');

      const suelto = screen
        .getAllByRole('button', { name: /comprar/i })
        .find((boton) => boton.getAttribute('aria-disabled') !== 'true');
      expect(suelto).toBeDefined();

      await userEvent.click(suelto as HTMLElement);

      await waitFor(() => expect(mockedCreateSession).toHaveBeenCalledTimes(1));
      expect(mockedCreateSession.mock.calls[0][0]).toBe('price_unico');
    });
  });

  describe('sin suscripción activa', () => {
    beforeEach(() => {
      mockedGetServices.mockResolvedValue([MENSUAL, PREMIUM, UNICO]);
      givenActiveAccount();
    });

    /**
     * El plan gratuito comparte `hasActiveSubscription: false` con un plan de pago caducado, y
     * en los dos casos hay que poder contratar: es justo el usuario al que esta pantalla sirve.
     */
    it('deja contratar cualquier plan y no marca ninguno como actual', async () => {
      givenBilling({ hasActiveSubscription: false, currentPlanType: 'free' });

      renderWithProviders(<PaymentServicesView />);

      const botones = await screen.findAllByRole('button', {
        name: /comprar/i,
      });
      expect(botones).toHaveLength(3);
      for (const boton of botones) {
        expect(boton).not.toHaveAttribute('aria-disabled', 'true');
      }
      expect(screen.queryByText('Plan actual')).not.toBeInTheDocument();
    });

    /**
     * Una baja programada NO libera la contratación: el perfil sigue ACTIVE hasta que termine el
     * periodo y el backend sigue rechazando el checkout con 409. Por eso se lee
     * `hasActiveSubscription` y no se deduce el bloqueo de `cancelAtPeriodEnd`.
     */
    it('sigue bloqueando cuando la baja ya está programada', async () => {
      givenBilling({
        hasActiveSubscription: true,
        cancelAtPeriodEnd: true,
        currentPlanType: 'pro',
      });

      renderWithProviders(<PaymentServicesView />);

      await screen.findByText('Plan actual');

      const bloqueados = screen
        .getAllByRole('button', { name: /comprar/i })
        .filter((boton) => boton.getAttribute('aria-disabled') === 'true');
      expect(bloqueados).toHaveLength(2);
    });

    /**
     * Si el estado comercial no se puede cargar se deja contratar: el backend sigue rechazando
     * con 409 lo que no corresponde, y bloquear por un fallo de red le impediría comprar a quien
     * no tiene ningún plan.
     */
    it('no bloquea nada si el estado de facturación falla', async () => {
      mockedGetBilling.mockRejectedValue(new Error('billing caído'));

      renderWithProviders(<PaymentServicesView />);

      const botones = await screen.findAllByRole('button', {
        name: /comprar/i,
      });
      for (const boton of botones) {
        expect(boton).not.toHaveAttribute('aria-disabled', 'true');
      }
    });
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

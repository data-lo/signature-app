import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SubscriptionStateCard from './SubscriptionStateCard';
import {
  cancelSubscriptionRequest,
  resumeSubscriptionRequest,
} from '../_requests';
import { billingAccessQueryKey } from '@/lib/hooks/useBillingAccess';
import { getBillingAccessRequest, type BillingAccess } from '@/lib/api/billing';
import { buildBillingAccess } from '@/lib/api/billing.fixtures';
import { useAuthStore } from '@/lib/store/useAuthStore';
import type { AccountKind } from '@/lib/store/types/auth-store.types';

jest.mock('../_requests');
jest.mock('@/lib/api/billing');

const mockedRequest = getBillingAccessRequest as jest.Mock;
const mockedCancel = cancelSubscriptionRequest as jest.Mock;
const mockedResume = resumeSubscriptionRequest as jest.Mock;

const PERSONAL_ACCOUNT_ID = 'cuenta-personal-1';
const ORGANIZATION_ACCOUNT_ID = 'cuenta-org-1';

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function givenActiveAccount(
  id: string,
  accountType: AccountKind = 'PERSONAL',
  organizationId: string | null = null,
) {
  useAuthStore.setState({
    activeAccount: { id, accountType, organizationId, roleId: null },
  });
}

/**
 * Se completa con `buildBillingAccess` en vez de escribir el objeto entero en cada prueba: la
 * respuesta trae ahora acciones, límites y saldo, y repetirlos veinte veces haría que agregar un
 * campo al contrato obligara a tocar veinte literales — con el riesgo de que alguno quedara
 * describiendo una forma que el backend ya no manda.
 */
function givenSubscription(state: Partial<BillingAccess>) {
  mockedRequest.mockResolvedValue(buildBillingAccess(state));
}

describe('SubscriptionStateCard', () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mockedRequest.mockReset();
    mockedCancel.mockReset();
    mockedResume.mockReset();
    mockedCancel.mockResolvedValue({
      status: 'ACTIVE',
      planType: 'plus',
      cancelAtPeriodEnd: true,
      currentPeriodEnd: '2030-02-01T00:00:00.000Z',
    });
    mockedResume.mockResolvedValue({
      status: 'ACTIVE',
      planType: 'plus',
      cancelAtPeriodEnd: false,
      currentPeriodEnd: '2030-02-01T00:00:00.000Z',
    });
    givenActiveAccount(PERSONAL_ACCOUNT_ID);
  });

  describe('cuenta personal', () => {
    /**
     * El caso que motiva la historia: tras `invoice.paid` el perfil queda ACTIVE y la pantalla
     * tiene que decir "Activa". Antes leía `account_subscriptions`, que el webhook mantiene por
     * compatibilidad pero no refleja la activación, y seguía mostrando la suscripción inactiva.
     */
    it('muestra ACTIVE como suscripción activa, con su plan y su periodo', async () => {
      givenSubscription({
        hasActiveSubscription: true,
        currentPlanType: 'plus',
        status: 'ACTIVE',
        cancelAtPeriodEnd: false,
        currentPeriodStart: '2030-01-01T00:00:00.000Z',
        currentPeriodEnd: '2030-02-01T00:00:00.000Z',
      });

      render(<SubscriptionStateCard />, { wrapper });

      await waitFor(() =>
        expect(screen.getByText(/plan plus — activa/i)).toBeInTheDocument(),
      );
      expect(screen.getByText(/está al corriente/i)).toBeInTheDocument();
      expect(screen.getByText(/periodo vigente hasta/i)).toBeInTheDocument();
    });
  });

  describe('organización', () => {
    /**
     * La tarjeta no distingue el tipo de cuenta: el backend ya resolvió el propietario a partir
     * del `X-Account-Id`. Lo que se comprueba es que pinta lo que llega para la organización
     * activa, no un estado personal heredado.
     */
    it('muestra el plan de la organización activa', async () => {
      givenActiveAccount(ORGANIZATION_ACCOUNT_ID, 'ORGANIZATION', 'org-1');
      givenSubscription({
        hasActiveSubscription: true,
        currentPlanType: 'premium',
        status: 'ACTIVE',
        cancelAtPeriodEnd: false,
        currentPeriodStart: null,
        currentPeriodEnd: null,
      });

      render(<SubscriptionStateCard />, { wrapper });

      await waitFor(() =>
        expect(screen.getByText(/plan premium — activa/i)).toBeInTheDocument(),
      );
    });
  });

  /**
   * El estado con el que llega TODA cuenta recién creada, desde que el alta deja su perfil
   * gratuito. Es el caso más común de esta pantalla, no un borde.
   */
  describe('plan gratuito', () => {
    it('lo presenta como el plan vigente, no como uno caducado', async () => {
      givenSubscription({
        hasActiveSubscription: false,
        currentPlanType: 'free',
        status: 'FREE',
        cancelAtPeriodEnd: false,
        currentPeriodStart: null,
        currentPeriodEnd: null,
      });

      render(<SubscriptionStateCard />, { wrapper });

      await waitFor(() =>
        expect(screen.getByText('Plan Gratuito')).toBeInTheDocument(),
      );
      /**
       * Lo que esta prueba impide: el plan gratuito comparte `hasActiveSubscription: false` con
       * un plan de pago caducado, y caer en ese texto le diría a quien acaba de registrarse que
       * su plan no habilita nada.
       */
      expect(
        screen.queryByText(/todavía no habilita la firma/i),
      ).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: /ver planes/i })).toHaveAttribute(
        'href',
        '/dashboard/plans',
      );
    });

    /**
     * Una organización comparte un solo perfil, así que su plan gratuito se ve igual: la tarjeta
     * no distingue el tipo de cuenta, el backend ya resolvió el propietario.
     */
    it('se ve igual en una cuenta de organización', async () => {
      givenActiveAccount(ORGANIZATION_ACCOUNT_ID, 'ORGANIZATION', 'org-1');
      givenSubscription({
        hasActiveSubscription: false,
        currentPlanType: 'free',
        status: 'FREE',
        cancelAtPeriodEnd: false,
        currentPeriodStart: null,
        currentPeriodEnd: null,
      });

      render(<SubscriptionStateCard />, { wrapper });

      await waitFor(() =>
        expect(screen.getByText('Plan Gratuito')).toBeInTheDocument(),
      );
    });
  });

  describe('perfil inexistente', () => {
    it('invita a contratar cuando la cuenta nunca ha pagado', async () => {
      givenSubscription({
        hasActiveSubscription: false,
        currentPlanType: null,
        status: null,
        cancelAtPeriodEnd: false,
        currentPeriodStart: null,
        currentPeriodEnd: null,
      });

      render(<SubscriptionStateCard />, { wrapper });

      await waitFor(() =>
        expect(screen.getByText(/sin suscripción activa/i)).toBeInTheDocument(),
      );
      expect(screen.getByRole('link', { name: /ver planes/i })).toHaveAttribute(
        'href',
        '/dashboard/plans',
      );
    });
  });

  describe('cancelación de la suscripción', () => {
    /**
     * Las dos condiciones de la historia: hay suscripción activa y todavía se renueva. Sólo
     * entonces tiene sentido ofrecer la baja.
     */
    it('ofrece cancelar una suscripción activa que se renueva', async () => {
      givenSubscription({
        hasActiveSubscription: true,
        currentPlanType: 'plus',
        status: 'ACTIVE',
        cancelAtPeriodEnd: false,
        currentPeriodStart: '2030-01-01T00:00:00.000Z',
        currentPeriodEnd: '2030-02-01T00:00:00.000Z',
      });

      render(<SubscriptionStateCard />, { wrapper });

      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: /cancelar suscripción/i }),
        ).toBeInTheDocument(),
      );
    });

    /**
     * Con la baja ya programada el botón desaparece: la suscripción sigue ACTIVE, así que sin
     * esta regla se volvería a ofrecer un clic que el backend rechaza con 409.
     */
    it('oculta el botón cuando la cancelación ya está programada', async () => {
      givenSubscription({
        hasActiveSubscription: true,
        currentPlanType: 'plus',
        status: 'ACTIVE',
        cancelAtPeriodEnd: true,
        currentPeriodStart: '2030-01-01T00:00:00.000Z',
        currentPeriodEnd: '2030-02-01T00:00:00.000Z',
      });

      render(<SubscriptionStateCard />, { wrapper });

      await waitFor(() =>
        expect(
          screen.getByText(/no se renovará automáticamente/i),
        ).toBeInTheDocument(),
      );
      expect(
        screen.queryByRole('button', { name: /cancelar suscripción/i }),
      ).not.toBeInTheDocument();
    });

    /**
     * La fecha esperada se calcula con el mismo formateo en vez de escribirse a mano: el periodo
     * llega en UTC y se muestra en la zona del navegador, así que un literal ataría la prueba a la
     * zona horaria de quien la corra —`2030-02-01T00:00:00Z` es el 31 de enero en México—.
     */
    it('anuncia hasta cuándo seguirá activa', async () => {
      givenSubscription({
        hasActiveSubscription: true,
        currentPlanType: 'plus',
        status: 'ACTIVE',
        cancelAtPeriodEnd: true,
        currentPeriodStart: '2030-01-01T00:00:00.000Z',
        currentPeriodEnd: '2030-02-01T00:00:00.000Z',
      });

      const fecha = new Date('2030-02-01T00:00:00.000Z').toLocaleDateString(
        'es-MX',
        { dateStyle: 'long' },
      );

      render(<SubscriptionStateCard />, { wrapper });

      await waitFor(() =>
        expect(
          screen.getByText(
            `Tu suscripción seguirá activa hasta el ${fecha}. No se renovará automáticamente.`,
          ),
        ).toBeInTheDocument(),
      );
    });

    /**
     * `CreateSubscriptionCheckoutUseCase` rechaza con 409 cualquier checkout sobre un perfil
     * ACTIVE, y uno con la baja programada lo sigue estando: ofrecer "Ver planes" ahí mandaría al
     * usuario a un error.
     */
    it('no ofrece contratar mientras la suscripción siga activa', async () => {
      givenSubscription({
        hasActiveSubscription: true,
        currentPlanType: 'plus',
        status: 'ACTIVE',
        cancelAtPeriodEnd: true,
        currentPeriodStart: null,
        currentPeriodEnd: null,
      });

      render(<SubscriptionStateCard />, { wrapper });

      await waitFor(() =>
        expect(
          screen.getByText(/no se renovará automáticamente/i),
        ).toBeInTheDocument(),
      );
      expect(
        screen.queryByRole('link', { name: /ver planes/i }),
      ).not.toBeInTheDocument();
    });

    /** Sin fecha registrada se dice lo mismo sin inventarse un día. */
    it('anuncia el término sin fecha cuando el periodo no la trae', async () => {
      givenSubscription({
        hasActiveSubscription: true,
        currentPlanType: 'plus',
        status: 'ACTIVE',
        cancelAtPeriodEnd: true,
        currentPeriodStart: null,
        currentPeriodEnd: null,
      });

      render(<SubscriptionStateCard />, { wrapper });

      await waitFor(() =>
        expect(
          screen.getByText(/hasta el final del periodo vigente/i),
        ).toBeInTheDocument(),
      );
    });
  });

  describe('operar sobre la renovación', () => {
    const ACTIVA = {
      hasActiveSubscription: true,
      currentPlanType: 'plus',
      status: 'ACTIVE',
      currentPeriodStart: '2030-01-01T00:00:00.000Z',
      currentPeriodEnd: '2030-02-01T00:00:00.000Z',
    } as const;

    async function confirmarCancelacion() {
      const user = userEvent.setup();
      await user.click(
        await screen.findByRole('button', { name: /cancelar suscripción/i }),
      );
      await user.click(
        await screen.findByRole('button', { name: /sí, cancelar/i }),
      );
      return user;
    }

    it('programa la baja al confirmar el modal', async () => {
      givenSubscription({ ...ACTIVA, cancelAtPeriodEnd: false });
      render(<SubscriptionStateCard />, { wrapper });

      await confirmarCancelacion();

      await waitFor(() => expect(mockedCancel).toHaveBeenCalledTimes(1));
    });

    /**
     * Una sola consulta describe el perfil y la comparte todo el árbol, así que refrescarla pone
     * al día la tarjeta y el estado global a la vez. Va con la cuenta en la llave para no tirar
     * lo consultado en la otra cuenta del mismo usuario.
     */
    it('refresca el estado comercial de la cuenta activa', async () => {
      const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
      givenSubscription({ ...ACTIVA, cancelAtPeriodEnd: false });
      render(<SubscriptionStateCard />, { wrapper });

      await confirmarCancelacion();

      await waitFor(() =>
        expect(invalidate).toHaveBeenCalledWith({
          queryKey: billingAccessQueryKey(PERSONAL_ACCOUNT_ID),
        }),
      );
    });

    /**
     * El modal se cierra al confirmar, así que un fallo del proveedor no tiene dónde contarse si
     * no es acá. Sin esto el usuario creería haber cancelado.
     */
    it('muestra en la tarjeta el fallo del proveedor', async () => {
      mockedCancel.mockRejectedValue({
        response: {
          status: 502,
          data: { message: 'El proveedor de pagos no está disponible.' },
        },
      });
      givenSubscription({ ...ACTIVA, cancelAtPeriodEnd: false });
      render(<SubscriptionStateCard />, { wrapper });

      await confirmarCancelacion();

      expect(
        await screen.findByText(/el proveedor de pagos no está disponible/i),
      ).toBeInTheDocument();
    });

    /** El 409 de "ya estaba cancelada" se cuenta con el mensaje del backend, no como avería. */
    it('muestra el conflicto cuando la baja ya estaba programada', async () => {
      mockedCancel.mockRejectedValue({
        response: {
          status: 409,
          data: {
            message:
              'La cancelación de tu suscripción ya está programada para el final del periodo vigente.',
          },
        },
      });
      givenSubscription({ ...ACTIVA, cancelAtPeriodEnd: false });
      render(<SubscriptionStateCard />, { wrapper });

      await confirmarCancelacion();

      expect(
        await screen.findByText(
          /ya está programada para el final del periodo/i,
        ),
      ).toBeInTheDocument();
    });

    /**
     * El camino de vuelta: sin él, quien programa la baja se queda sin ninguna acción -no puede
     * cancelar ni contratar- y deshacerlo exigiría entrar al Dashboard de Stripe.
     */
    it('ofrece reanudar cuando la baja está programada', async () => {
      givenSubscription({ ...ACTIVA, cancelAtPeriodEnd: true });
      render(<SubscriptionStateCard />, { wrapper });

      const user = userEvent.setup();
      await user.click(
        await screen.findByRole('button', { name: /reanudar suscripción/i }),
      );

      await waitFor(() => expect(mockedResume).toHaveBeenCalledTimes(1));
    });

    /** Reanudar no le quita nada al usuario y se puede volver a cancelar: no lleva modal. */
    it('reanuda sin pedir confirmación', async () => {
      givenSubscription({ ...ACTIVA, cancelAtPeriodEnd: true });
      render(<SubscriptionStateCard />, { wrapper });

      const user = userEvent.setup();
      await user.click(
        await screen.findByRole('button', { name: /reanudar suscripción/i }),
      );

      expect(
        screen.queryByRole('heading', { name: /¿cancelar tu suscripción\?/i }),
      ).not.toBeInTheDocument();
    });

    it('no ofrece reanudar una suscripción que ya se renueva', async () => {
      givenSubscription({ ...ACTIVA, cancelAtPeriodEnd: false });
      render(<SubscriptionStateCard />, { wrapper });

      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: /cancelar suscripción/i }),
        ).toBeInTheDocument(),
      );
      expect(
        screen.queryByRole('button', { name: /reanudar suscripción/i }),
      ).not.toBeInTheDocument();
    });

    it('informa mientras la operación está en curso', async () => {
      let resolver: (value: unknown) => void = () => undefined;
      mockedResume.mockReturnValue(
        new Promise((resolve) => {
          resolver = resolve;
        }),
      );
      givenSubscription({ ...ACTIVA, cancelAtPeriodEnd: true });
      render(<SubscriptionStateCard />, { wrapper });

      const user = userEvent.setup();
      const boton = await screen.findByRole('button', {
        name: /reanudar suscripción/i,
      });
      await user.click(boton);

      expect(
        await screen.findByText(/reanudando tu suscripción/i),
      ).toBeInTheDocument();
      expect(boton).toBeDisabled();

      resolver({ cancelAtPeriodEnd: false });
    });
  });

  describe('saldo de documentos', () => {
    it('muestra el saldo disponible y el tope incluido por periodo', async () => {
      givenSubscription({
        hasActiveSubscription: true,
        currentPlanType: 'premium',
        status: 'ACTIVE',
        creditsAvailable: 18,
        limits: { documentsIncludedPerPeriod: 60, maxOrganizationMembers: null },
      });

      render(<SubscriptionStateCard />, { wrapper });

      expect(
        await screen.findByText(/de 60 incluidos por periodo/i),
      ).toBeInTheDocument();
      expect(screen.getByText('18')).toBeInTheDocument();
    });

    /**
     * Un tope nulo significa "no lo fija el plan" —se negocia por contrato—, así que se calla en
     * vez de inventar un número: anunciar un límite que no existe es peor que no anunciar ninguno.
     */
    it('no anuncia tope cuando el plan no lo fija', async () => {
      givenSubscription({
        hasActiveSubscription: true,
        currentPlanType: 'enterprise',
        status: 'ACTIVE',
        creditsAvailable: 5,
        limits: {
          documentsIncludedPerPeriod: null,
          maxOrganizationMembers: null,
        },
      });

      render(<SubscriptionStateCard />, { wrapper });

      expect(
        await screen.findByText(/documentos disponibles/i),
      ).toBeInTheDocument();
      expect(
        screen.queryByText(/incluidos por periodo/i),
      ).not.toBeInTheDocument();
    });

    it('también lo muestra en el plan gratuito', async () => {
      givenSubscription({
        hasActiveSubscription: false,
        currentPlanType: 'free',
        status: 'FREE',
        creditsAvailable: 3,
      });

      render(<SubscriptionStateCard />, { wrapper });

      await waitFor(() =>
        expect(screen.getByText('Plan Gratuito')).toBeInTheDocument(),
      );
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('estados que no habilitan', () => {
    it.each([
      ['INCOMPLETE', /pendiente de confirmación/i],
      ['PAST_DUE', /con un pago pendiente/i],
      ['CANCELED', /cancelada/i],
    ] as const)('rotula %s sin darlo por vigente', async (status, rotulo) => {
      givenSubscription({
        hasActiveSubscription: false,
        currentPlanType: 'basic',
        status,
        cancelAtPeriodEnd: false,
        currentPeriodStart: null,
        currentPeriodEnd: null,
      });

      render(<SubscriptionStateCard />, { wrapper });

      await waitFor(() => expect(screen.getByText(rotulo)).toBeInTheDocument());
      expect(
        screen.getByText(/todavía no habilita la firma/i),
      ).toBeInTheDocument();
    });
  });

  describe('mientras carga o falla', () => {
    it('avisa que está cargando', () => {
      mockedRequest.mockReturnValue(new Promise(() => {}));

      render(<SubscriptionStateCard />, { wrapper });

      expect(screen.getByText(/cargando tu suscripción/i)).toBeInTheDocument();
    });

    it('avisa del fallo sin inventar un estado', async () => {
      mockedRequest.mockRejectedValue(new Error('boom'));

      render(<SubscriptionStateCard />, { wrapper });

      await waitFor(() =>
        expect(
          screen.getByText(/no se pudo cargar el estado/i),
        ).toBeInTheDocument(),
      );
    });
  });
});

import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SubscriptionStateCard from './SubscriptionStateCard';
import { getSubscriptionStateRequest } from '../_requests';
import { useAuthStore } from '@/lib/store/useAuthStore';
import type { AccountKind } from '@/lib/store/types/auth-store.types';
import type { SubscriptionState } from '../_interfaces/subscription-state.interface';

jest.mock('../_requests');

const mockedRequest = getSubscriptionStateRequest as jest.Mock;

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

function givenSubscription(state: SubscriptionState) {
  mockedRequest.mockResolvedValue(state);
}

describe('SubscriptionStateCard', () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mockedRequest.mockReset();
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
        planType: 'plus',
        status: 'ACTIVE',
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
        planType: 'premium',
        status: 'ACTIVE',
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
        planType: 'free',
        status: 'FREE',
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
        planType: 'free',
        status: 'FREE',
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
        planType: null,
        status: null,
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

  describe('estados que no habilitan', () => {
    it.each([
      ['INCOMPLETE', /pendiente de confirmación/i],
      ['PAST_DUE', /con un pago pendiente/i],
      ['CANCELED', /cancelada/i],
    ] as const)('rotula %s sin darlo por vigente', async (status, rotulo) => {
      givenSubscription({
        hasActiveSubscription: false,
        planType: 'basic',
        status,
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

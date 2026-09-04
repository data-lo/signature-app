import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SubscriptionStateCard from './SubscriptionStateCard';
import { getBillingStateRequest, type BillingState } from '@/lib/api/billing';
import { useAuthStore } from '@/lib/store/useAuthStore';
import type { AccountKind } from '@/lib/store/types/auth-store.types';

jest.mock('@/lib/api/billing');

const mockedGetBillingState = getBillingStateRequest as jest.Mock;

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

function givenBillingState(state: BillingState) {
  mockedGetBillingState.mockResolvedValue(state);
}

describe('SubscriptionStateCard', () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mockedGetBillingState.mockReset();
    useAuthStore.setState({ billingByAccountId: {} });
    givenActiveAccount(PERSONAL_ACCOUNT_ID);
  });

  describe('cuenta personal', () => {
    it('muestra el plan vigente cuando la suscripción está activa', async () => {
      givenBillingState({
        billingProfileId: 'perfil-personal',
        hasActiveSubscription: true,
        currentPlanType: 'plus',
      });

      render(<SubscriptionStateCard />, { wrapper });

      await waitFor(() =>
        expect(screen.getByText('Plan Plus')).toBeInTheDocument(),
      );
      expect(screen.getByText(/está al corriente/i)).toBeInTheDocument();
    });
  });

  describe('organización', () => {
    /**
     * La tarjeta no distingue el tipo de cuenta: el backend ya resolvió el propietario a partir
     * del `X-Account-Id`. Lo que se comprueba acá es que muestra lo que llega para la cuenta de
     * organización activa, no un estado personal heredado.
     */
    it('muestra el plan de la organización activa', async () => {
      givenActiveAccount(ORGANIZATION_ACCOUNT_ID, 'ORGANIZATION', 'org-1');
      givenBillingState({
        billingProfileId: 'perfil-organizacion',
        hasActiveSubscription: true,
        currentPlanType: 'premium',
      });

      render(<SubscriptionStateCard />, { wrapper });

      await waitFor(() =>
        expect(screen.getByText('Plan Premium')).toBeInTheDocument(),
      );
    });
  });

  describe('perfil inexistente', () => {
    it('invita a contratar cuando la cuenta nunca ha pagado', async () => {
      givenBillingState({
        billingProfileId: null,
        hasActiveSubscription: false,
        currentPlanType: null,
      });

      render(<SubscriptionStateCard />, { wrapper });

      await waitFor(() =>
        expect(screen.getByText(/sin suscripción activa/i)).toBeInTheDocument(),
      );
      expect(
        screen.getByText(/todavía no has contratado ningún servicio/i),
      ).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /ver planes/i })).toHaveAttribute(
        'href',
        '/dashboard/plans',
      );
    });
  });

  /**
   * `INCOMPLETE`, `PAST_DUE` y `CANCELED` llegan igual desde el backend —
   * `hasActiveSubscription: false` conservando el último plan contratado—, así que la tarjeta lo
   * nombra pero deja claro que no habilita nada.
   */
  describe('perfil sin suscripción vigente', () => {
    it('nombra el último plan contratado sin darlo por vigente', async () => {
      givenBillingState({
        billingProfileId: 'perfil-personal',
        hasActiveSubscription: false,
        currentPlanType: 'basic',
      });

      render(<SubscriptionStateCard />, { wrapper });

      await waitFor(() =>
        expect(screen.getByText(/sin suscripción activa/i)).toBeInTheDocument(),
      );
      expect(screen.getByText(/tu plan basic no está vigente/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /ver planes/i })).toBeInTheDocument();
    });
  });

  describe('mientras carga o falla', () => {
    it('avisa que está cargando', () => {
      mockedGetBillingState.mockReturnValue(new Promise(() => {}));

      render(<SubscriptionStateCard />, { wrapper });

      expect(screen.getByText(/cargando tu suscripción/i)).toBeInTheDocument();
    });

    it('avisa del fallo sin inventar un estado', async () => {
      mockedGetBillingState.mockRejectedValue(new Error('boom'));

      render(<SubscriptionStateCard />, { wrapper });

      await waitFor(() =>
        expect(
          screen.getByText(/no se pudo cargar el estado/i),
        ).toBeInTheDocument(),
      );
      expect(screen.queryByText(/sin suscripción activa/i)).not.toBeInTheDocument();
    });
  });
});

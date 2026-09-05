import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PaymentReturnNotice from './PaymentReturnNotice';
import { getSubscriptionStateRequest } from '../_requests';
import { subscriptionStateQueryKey } from '../_hooks/useSubscriptionState';
import { billingStateQueryKey } from '@/lib/hooks/useBillingState';
import { useAuthStore } from '@/lib/store/useAuthStore';
import type { SubscriptionState } from '../_interfaces/subscription-state.interface';

/**
 * El mock lee la variable en cada llamada, así que basta con reasignarla entre pruebas. Mutar
 * un mismo `URLSearchParams` con `delete` mientras se itera deja parámetros de la prueba
 * anterior y las contamina entre sí.
 */
let mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}));
jest.mock('../_requests');

const mockedRequest = getSubscriptionStateRequest as jest.Mock;

const ACCOUNT_ID = 'cuenta-1';
const GRATUITA: SubscriptionState = {
  hasActiveSubscription: false,
  planType: 'free',
  status: 'FREE',
  currentPeriodStart: null,
  currentPeriodEnd: null,
};
const ACTIVA: SubscriptionState = {
  hasActiveSubscription: true,
  planType: 'plus',
  status: 'ACTIVE',
  currentPeriodStart: '2030-01-01T00:00:00.000Z',
  currentPeriodEnd: '2030-02-01T00:00:00.000Z',
};

function givenQuery(query: string) {
  mockSearchParams = new URLSearchParams(query);
}

let queryClient: QueryClient;

function renderNotice() {
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }
  return render(<PaymentReturnNotice />, { wrapper });
}

describe('PaymentReturnNotice', () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mockedRequest.mockReset();
    mockedRequest.mockResolvedValue(GRATUITA);
    useAuthStore.setState({
      activeAccount: {
        id: ACCOUNT_ID,
        accountType: 'PERSONAL',
        organizationId: null,
        roleId: null,
      },
      billingByAccountId: {},
    });
  });

  it('payment=success: acusa recibo sin dar la suscripción por activa', async () => {
    givenQuery('payment=success&session_id=cs_test_1');

    renderNotice();

    expect(screen.getByText(/pago recibido/i)).toBeInTheDocument();
    expect(
      screen.getByText(/estamos confirmando tu suscripción/i),
    ).toBeInTheDocument();
    /**
     * La URL de retorno es manipulable: cualquiera puede escribir ?payment=success a mano. El
     * aviso no puede afirmar que la suscripción quedó activa — eso lo confirma el webhook.
     */
    expect(screen.queryByText(/suscripción activa/i)).not.toBeInTheDocument();
  });

  describe('refresco del estado al volver de Stripe', () => {
    it('consulta la suscripción de la cuenta activa', async () => {
      givenQuery('payment=success');

      renderNotice();

      await waitFor(() => expect(mockedRequest).toHaveBeenCalled());
    });

    /**
     * Las DOS consultas del perfil se invalidan: la de esta pantalla y la del estado global por
     * cuenta. Salen del mismo `billing_profile`, así que refrescar sólo una dejaría al resto de
     * la aplicación creyendo todavía que no hay plan.
     */
    it('invalida tanto la suscripción como el estado global de esa cuenta', async () => {
      const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
      givenQuery('payment=success');

      renderNotice();

      await waitFor(() =>
        expect(invalidateQueries).toHaveBeenCalledWith({
          queryKey: subscriptionStateQueryKey(ACCOUNT_ID),
        }),
      );
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: billingStateQueryKey(ACCOUNT_ID),
      });
    });

    /** El texto sólo cambia cuando el estado REAL —el que dejó el webhook— lo confirma. */
    it('pasa a "Suscripción activa" cuando el webhook la activa', async () => {
      mockedRequest.mockResolvedValue(ACTIVA);
      givenQuery('payment=success');

      renderNotice();

      await waitFor(() =>
        expect(screen.getByText(/suscripción activa/i)).toBeInTheDocument(),
      );
      expect(
        screen.queryByText(/estamos confirmando tu suscripción/i),
      ).not.toBeInTheDocument();
    });

    /** Quien entra por el menú no acaba de pagar: no hay ningún cambio que esperar. */
    it('no invalida nada si no se viene de un pago', async () => {
      const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
      givenQuery('payment=cancel');

      renderNotice();

      await waitFor(() =>
        expect(screen.getByText(/pago cancelado/i)).toBeInTheDocument(),
      );
      expect(invalidateQueries).not.toHaveBeenCalled();
    });
  });

  it('payment=cancel: avisa que no hubo cargo y deja reintentar', () => {
    givenQuery('payment=cancel');

    renderNotice();

    expect(screen.getByText(/pago cancelado/i)).toBeInTheDocument();
    expect(screen.getByText(/no se realizó ningún cargo/i)).toBeInTheDocument();
  });

  it('sin el parámetro no dibuja nada', () => {
    givenQuery('');

    const { container } = renderNotice();

    expect(container).toBeEmptyDOMElement();
  });

  it('un valor desconocido tampoco dibuja nada', () => {
    givenQuery('payment=cualquier-cosa');

    const { container } = renderNotice();

    expect(container).toBeEmptyDOMElement();
  });
});

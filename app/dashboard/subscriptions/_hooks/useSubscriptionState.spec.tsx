import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ACTIVATION_POLL_INTERVAL_MS,
  ACTIVATION_POLL_TIMEOUT_MS,
  subscriptionStateQueryKey,
  useSubscriptionState,
} from './useSubscriptionState';
import { getSubscriptionStateRequest } from '../_requests';
import { useAuthStore } from '@/lib/store/useAuthStore';
import type { AccountKind } from '@/lib/store/types/auth-store.types';
import type { SubscriptionState } from '../_interfaces/subscription-state.interface';

jest.mock('../_requests');

const mockedRequest = getSubscriptionStateRequest as jest.Mock;

const GRATUITA: SubscriptionState = {
  hasActiveSubscription: false,
  planType: 'free',
  status: 'FREE',
  currentPeriodStart: null,
  currentPeriodEnd: null,
};
const ACTIVA_ORG: SubscriptionState = {
  hasActiveSubscription: true,
  planType: 'premium',
  status: 'ACTIVE',
  currentPeriodStart: '2030-01-01T00:00:00.000Z',
  currentPeriodEnd: '2030-02-01T00:00:00.000Z',
};

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function setActiveAccount(
  id: string,
  accountType: AccountKind = 'PERSONAL',
  organizationId: string | null = null,
) {
  act(() => {
    useAuthStore.setState({
      activeAccount: { id, accountType, organizationId, roleId: null },
    });
  });
}

describe('useSubscriptionState', () => {
  beforeEach(() => {
    mockedRequest.mockReset();
    mockedRequest.mockResolvedValue(GRATUITA);
    useAuthStore.setState({ activeAccount: null });
  });

  it('consulta el estado de la cuenta activa', async () => {
    setActiveAccount('cuenta-personal');

    const { result } = renderHook(() => useSubscriptionState(), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual(GRATUITA));
    expect(mockedRequest).toHaveBeenCalledTimes(1);
  });

  /**
   * Sin cuenta activa la petición sale sin `X-Account-Id` y el backend responde 400. Ocurre en
   * cada carga del dashboard, mientras el tenant se rehidrata desde localStorage.
   */
  it('no consulta mientras la cuenta activa aún no hidrata', () => {
    renderHook(() => useSubscriptionState(), { wrapper });

    expect(mockedRequest).not.toHaveBeenCalled();
  });

  describe('caché por cuenta', () => {
    it('la llave incluye el accountId', () => {
      expect(subscriptionStateQueryKey('cuenta-1')).toEqual([
        'subscriptionState',
        'cuenta-1',
      ]);
      expect(subscriptionStateQueryKey('cuenta-org')).not.toEqual(
        subscriptionStateQueryKey('cuenta-1'),
      );
    });

    /**
     * Lo que esta prueba impide: sin la cuenta en la llave, el caché seguiría sirviendo la
     * suscripción de la cuenta personal después de cambiar a la organización — que es
     * exactamente cómo una organización parecería no tener plan, o tener el de quien la mira.
     */
    it('vuelve a consultar al cambiar de cuenta personal a organización', async () => {
      mockedRequest
        .mockResolvedValueOnce(GRATUITA)
        .mockResolvedValueOnce(ACTIVA_ORG);

      setActiveAccount('cuenta-personal');
      const { result } = renderHook(() => useSubscriptionState(), { wrapper });

      await waitFor(() => expect(result.current.data).toEqual(GRATUITA));

      setActiveAccount('cuenta-org', 'ORGANIZATION', 'org-1');

      await waitFor(() => expect(result.current.data).toEqual(ACTIVA_ORG));
      expect(mockedRequest).toHaveBeenCalledTimes(2);
    });
  });

  /**
   * El retorno de Stripe no confirma nada: activa la suscripción el webhook `invoice.paid`, que
   * llega unos segundos después. Sin insistir, el usuario vuelve de pagar y ve "pendiente" hasta
   * que recargue a mano.
   *
   * El sondeo vive en ESTA consulta y no en `useBillingState` porque es la que dibuja la pantalla
   * que el usuario está mirando.
   */
  describe('espera de la activación tras volver de Stripe', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    async function avanzar(ms: number) {
      await act(async () => {
        jest.advanceTimersByTime(ms);
      });
    }

    it('reintenta hasta que el webhook activa la suscripción, y entonces se detiene', async () => {
      mockedRequest
        .mockResolvedValueOnce(GRATUITA)
        .mockResolvedValueOnce(GRATUITA)
        .mockResolvedValue(ACTIVA_ORG);

      setActiveAccount('cuenta-personal');
      const { result } = renderHook(
        () => useSubscriptionState({ awaitActivation: true }),
        { wrapper },
      );

      await waitFor(() => expect(result.current.data).toEqual(GRATUITA));

      await avanzar(ACTIVATION_POLL_INTERVAL_MS);
      await avanzar(ACTIVATION_POLL_INTERVAL_MS);

      await waitFor(() =>
        expect(result.current.data?.hasActiveSubscription).toBe(true),
      );

      const llamadasAlActivarse = mockedRequest.mock.calls.length;
      // Guarda contra un falso verde: sin reintentos nunca se habría visto la activación.
      expect(llamadasAlActivarse).toBeGreaterThan(1);

      // Ya está activa: no se vuelve a preguntar por más que pase el tiempo.
      await avanzar(ACTIVATION_POLL_INTERVAL_MS * 5);

      expect(mockedRequest).toHaveBeenCalledTimes(llamadasAlActivarse);
    });

    /**
     * El webhook puede no llegar nunca (una tarjeta rechazada después del checkout). Sin límite,
     * la pestaña olvidada se queda pegándole al backend para siempre.
     */
    it('deja de reintentar al agotarse el plazo aunque siga inactiva', async () => {
      setActiveAccount('cuenta-personal');
      const { result } = renderHook(
        () => useSubscriptionState({ awaitActivation: true }),
        { wrapper },
      );

      await waitFor(() => expect(result.current.data).toEqual(GRATUITA));

      await avanzar(ACTIVATION_POLL_TIMEOUT_MS + ACTIVATION_POLL_INTERVAL_MS);
      const llamadasTrasElPlazo = mockedRequest.mock.calls.length;
      // Durante el plazo sí se insistió: sin esto la prueba pasaría igual sin reintentos.
      expect(llamadasTrasElPlazo).toBeGreaterThan(1);

      await avanzar(ACTIVATION_POLL_INTERVAL_MS * 10);

      expect(mockedRequest).toHaveBeenCalledTimes(llamadasTrasElPlazo);
      expect(result.current.data?.hasActiveSubscription).toBe(false);
    });

    /** Fuera del retorno de Stripe no hay ningún cambio que esperar. */
    it('no reintenta si no se está esperando la activación', async () => {
      setActiveAccount('cuenta-personal');
      const { result } = renderHook(() => useSubscriptionState(), { wrapper });

      await waitFor(() => expect(result.current.data).toEqual(GRATUITA));

      await avanzar(ACTIVATION_POLL_INTERVAL_MS * 5);

      expect(mockedRequest).toHaveBeenCalledTimes(1);
    });
  });
});

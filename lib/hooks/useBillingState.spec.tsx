import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ACTIVATION_POLL_INTERVAL_MS,
  ACTIVATION_POLL_TIMEOUT_MS,
  billingStateQueryKey,
  useBillingState,
  useKnownBillingState,
} from './useBillingState';
import { getBillingStateRequest } from '@/lib/api/billing';
import { useAuthStore } from '@/lib/store/useAuthStore';
import type { AccountKind } from '@/lib/store/types/auth-store.types';

jest.mock('@/lib/api/billing');

const mockedGetBillingState = getBillingStateRequest as jest.Mock;

const SIN_PERFIL = {
  billingProfileId: null,
  hasActiveSubscription: false,
  currentPlanType: null,
};
const ACTIVO = {
  billingProfileId: 'perfil-1',
  hasActiveSubscription: true,
  currentPlanType: 'plus',
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

describe('useBillingState', () => {
  beforeEach(() => {
    mockedGetBillingState.mockReset();
    mockedGetBillingState.mockResolvedValue(SIN_PERFIL);
    useAuthStore.setState({ activeAccount: null, billingByAccountId: {} });
  });

  describe('al iniciar sesión', () => {
    it('consulta el estado de la cuenta activa', async () => {
      setActiveAccount('account-1');

      const { result } = renderHook(() => useBillingState(), { wrapper });

      await waitFor(() => expect(result.current.data).toEqual(SIN_PERFIL));
      expect(mockedGetBillingState).toHaveBeenCalledTimes(1);
    });

    /**
     * Mismo defecto que ya se corrigió en `useDocuments`: sin cuenta activa la petición sale sin
     * `X-Account-Id` —lo pone el interceptor desde el store— y el backend responde 400. Pasa en
     * cada carga del dashboard, mientras el tenant se rehidrata desde localStorage.
     */
    it('no consulta mientras la cuenta activa aún no hidrata', () => {
      renderHook(() => useBillingState(), { wrapper });

      expect(mockedGetBillingState).not.toHaveBeenCalled();
    });
  });

  describe('al cambiar de cuenta activa', () => {
    /**
     * La cuenta va en la `queryKey`, así que el cambio dispara la consulta nueva sin ningún
     * efecto explícito. Si no fuera así, el caché seguiría sirviendo el plan de la cuenta
     * anterior: exactamente el error que hace que una organización parezca tener el plan de la
     * cuenta personal de quien la mira.
     */
    it('vuelve a consultar para el nuevo accountId', async () => {
      mockedGetBillingState
        .mockResolvedValueOnce(SIN_PERFIL)
        .mockResolvedValueOnce(ACTIVO);

      setActiveAccount('account-personal');
      const { result } = renderHook(() => useBillingState(), { wrapper });

      await waitFor(() => expect(result.current.data).toEqual(SIN_PERFIL));

      setActiveAccount('account-org', 'ORGANIZATION', 'org-1');

      await waitFor(() => expect(result.current.data).toEqual(ACTIVO));
      expect(mockedGetBillingState).toHaveBeenCalledTimes(2);
    });

    it('la llave de caché incluye la cuenta', () => {
      expect(billingStateQueryKey('account-1')).toEqual([
        'billingState',
        'account-1',
      ]);
      expect(billingStateQueryKey('account-org')).not.toEqual(
        billingStateQueryKey('account-1'),
      );
    });
  });

  describe('estado global', () => {
    it('guarda el resultado indexado por accountId', async () => {
      mockedGetBillingState.mockResolvedValue(ACTIVO);
      setActiveAccount('account-1');

      renderHook(() => useBillingState(), { wrapper });

      await waitFor(() =>
        expect(useAuthStore.getState().billingByAccountId).toEqual({
          'account-1': ACTIVO,
        }),
      );
    });

    it('conserva lo ya consultado de la cuenta anterior al cambiar de cuenta', async () => {
      mockedGetBillingState
        .mockResolvedValueOnce(ACTIVO)
        .mockResolvedValueOnce(SIN_PERFIL);

      setActiveAccount('account-personal');
      renderHook(() => useBillingState(), { wrapper });

      await waitFor(() =>
        expect(
          useAuthStore.getState().billingByAccountId['account-personal'],
        ).toEqual(ACTIVO),
      );

      setActiveAccount('account-org', 'ORGANIZATION', 'org-1');

      await waitFor(() =>
        expect(
          useAuthStore.getState().billingByAccountId['account-org'],
        ).toEqual(SIN_PERFIL),
      );
      expect(
        useAuthStore.getState().billingByAccountId['account-personal'],
      ).toEqual(ACTIVO);
    });

    it('useKnownBillingState lee del store sin disparar ninguna petición', () => {
      useAuthStore.setState({ billingByAccountId: { 'account-1': ACTIVO } });

      const { result } = renderHook(
        () => useKnownBillingState('account-1'),
        { wrapper },
      );

      expect(result.current).toEqual(ACTIVO);
      expect(mockedGetBillingState).not.toHaveBeenCalled();
    });

    /** "Todavía no se ha consultado" no es lo mismo que "no tiene plan". */
    it('useKnownBillingState devuelve undefined para una cuenta no consultada', () => {
      const { result } = renderHook(
        () => useKnownBillingState('account-desconocida'),
        { wrapper },
      );

      expect(result.current).toBeUndefined();
    });
  });

  /**
   * El retorno de Stripe no confirma nada: activa el perfil el webhook `invoice.paid`, que llega
   * unos segundos después. Sin insistir, el usuario vuelve de pagar y ve "sin plan" hasta que
   * recargue a mano.
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

    it('reintenta hasta que el webhook activa el perfil, y entonces se detiene', async () => {
      mockedGetBillingState
        .mockResolvedValueOnce(SIN_PERFIL)
        .mockResolvedValueOnce(SIN_PERFIL)
        .mockResolvedValue(ACTIVO);

      setActiveAccount('account-1');
      const { result } = renderHook(
        () => useBillingState({ awaitActivation: true }),
        { wrapper },
      );

      await waitFor(() => expect(result.current.data).toEqual(SIN_PERFIL));

      await avanzar(ACTIVATION_POLL_INTERVAL_MS);
      await avanzar(ACTIVATION_POLL_INTERVAL_MS);

      await waitFor(() =>
        expect(result.current.data?.hasActiveSubscription).toBe(true),
      );

      const llamadasAlActivarse = mockedGetBillingState.mock.calls.length;
      // Guarda contra un falso verde: si no hubiera reintentos, nunca se habría visto ACTIVO.
      expect(llamadasAlActivarse).toBeGreaterThan(1);

      // Ya está activo: no se vuelve a preguntar por más que pase el tiempo.
      await avanzar(ACTIVATION_POLL_INTERVAL_MS * 5);

      expect(mockedGetBillingState).toHaveBeenCalledTimes(llamadasAlActivarse);
    });

    /**
     * El webhook puede no llegar nunca (una tarjeta rechazada después del checkout). Sin límite,
     * la pestaña olvidada se queda pegándole al backend para siempre.
     */
    it('deja de reintentar al agotarse el plazo aunque siga inactivo', async () => {
      setActiveAccount('account-1');
      const { result } = renderHook(
        () => useBillingState({ awaitActivation: true }),
        { wrapper },
      );

      await waitFor(() => expect(result.current.data).toEqual(SIN_PERFIL));

      await avanzar(ACTIVATION_POLL_TIMEOUT_MS + ACTIVATION_POLL_INTERVAL_MS);
      const llamadasTrasElPlazo = mockedGetBillingState.mock.calls.length;
      // Durante el plazo sí se insistió: sin esto la prueba pasaría igual sin reintentos.
      expect(llamadasTrasElPlazo).toBeGreaterThan(1);

      await avanzar(ACTIVATION_POLL_INTERVAL_MS * 10);

      expect(mockedGetBillingState).toHaveBeenCalledTimes(llamadasTrasElPlazo);
      expect(result.current.data?.hasActiveSubscription).toBe(false);
    });

    /** Fuera del retorno de Stripe no hay ningún cambio que esperar. */
    it('no reintenta si no se está esperando la activación', async () => {
      setActiveAccount('account-1');
      const { result } = renderHook(() => useBillingState(), { wrapper });

      await waitFor(() => expect(result.current.data).toEqual(SIN_PERFIL));

      await avanzar(ACTIVATION_POLL_INTERVAL_MS * 5);

      expect(mockedGetBillingState).toHaveBeenCalledTimes(1);
    });
  });
});

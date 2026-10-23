import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ACTIVATION_POLL_INTERVAL_MS,
  billingAccessQueryKey,
  useBillingAccess,
  useCanPerform,
  useKnownBillingAccess,
} from './useBillingAccess';
import { getBillingAccessRequest } from '@/lib/api/billing';
import { buildBillingAccess, SIN_PERFIL } from '@/lib/api/billing.fixtures';
import { useAuthStore } from '@/lib/store/useAuthStore';
import type { AccountKind } from '@/lib/store/types/auth-store.types';

jest.mock('@/lib/api/billing');

const mockedGetBillingAccess = getBillingAccessRequest as jest.Mock;

const PREMIUM = buildBillingAccess({
  currentPlanType: 'premium',
  actions: { preApproval: true, bulkSigning: true },
});

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

describe('useBillingAccess', () => {
  beforeEach(() => {
    mockedGetBillingAccess.mockReset();
    mockedGetBillingAccess.mockResolvedValue(SIN_PERFIL);
    useAuthStore.setState({ activeAccount: null, billingByAccountId: {} });
  });

  describe('al iniciar sesión', () => {
    it('consulta el estado comercial de la cuenta activa', async () => {
      setActiveAccount('account-1');

      const { result } = renderHook(() => useBillingAccess(), { wrapper });

      await waitFor(() => expect(result.current.data).toEqual(SIN_PERFIL));
      expect(mockedGetBillingAccess).toHaveBeenCalledTimes(1);
    });

    /**
     * Sin cuenta activa la petición sale sin `X-Account-Id` —lo pone el interceptor desde el
     * store— y el backend responde 400. Pasa en cada carga del dashboard, mientras el tenant se
     * rehidrata desde localStorage.
     */
    it('no consulta mientras la cuenta activa aún no hidrata', () => {
      renderHook(() => useBillingAccess(), { wrapper });

      expect(mockedGetBillingAccess).not.toHaveBeenCalled();
    });

    it('trae acciones y límites junto con el estado del perfil', async () => {
      mockedGetBillingAccess.mockResolvedValue(PREMIUM);
      setActiveAccount('account-1');

      const { result } = renderHook(() => useBillingAccess(), { wrapper });

      await waitFor(() =>
        expect(result.current.data?.actions.preApproval).toBe(true),
      );
      expect(result.current.data?.limits).toEqual(PREMIUM.limits);
      expect(result.current.data?.creditsAvailable).toBe(18);
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
      mockedGetBillingAccess
        .mockResolvedValueOnce(SIN_PERFIL)
        .mockResolvedValueOnce(PREMIUM);

      setActiveAccount('account-personal');
      const { result } = renderHook(() => useBillingAccess(), { wrapper });

      await waitFor(() => expect(result.current.data).toEqual(SIN_PERFIL));

      setActiveAccount('account-org', 'ORGANIZATION', 'org-1');

      await waitFor(() => expect(result.current.data).toEqual(PREMIUM));
      expect(mockedGetBillingAccess).toHaveBeenCalledTimes(2);
    });

    it('la llave de caché incluye la cuenta', () => {
      expect(billingAccessQueryKey('account-1')).toEqual([
        'billingAccess',
        'account-1',
      ]);
      expect(billingAccessQueryKey('account-org')).not.toEqual(
        billingAccessQueryKey('account-1'),
      );
    });
  });

  describe('estado global', () => {
    it('guarda el resultado indexado por accountId', async () => {
      mockedGetBillingAccess.mockResolvedValue(PREMIUM);
      setActiveAccount('account-1');

      renderHook(() => useBillingAccess(), { wrapper });

      await waitFor(() =>
        expect(useAuthStore.getState().billingByAccountId).toEqual({
          'account-1': PREMIUM,
        }),
      );
    });

    it('conserva lo ya consultado de la cuenta anterior al cambiar de cuenta', async () => {
      mockedGetBillingAccess
        .mockResolvedValueOnce(PREMIUM)
        .mockResolvedValueOnce(SIN_PERFIL);

      setActiveAccount('account-personal');
      renderHook(() => useBillingAccess(), { wrapper });

      await waitFor(() =>
        expect(
          useAuthStore.getState().billingByAccountId['account-personal'],
        ).toEqual(PREMIUM),
      );

      setActiveAccount('account-org', 'ORGANIZATION', 'org-1');

      await waitFor(() =>
        expect(
          useAuthStore.getState().billingByAccountId['account-org'],
        ).toEqual(SIN_PERFIL),
      );
      expect(
        useAuthStore.getState().billingByAccountId['account-personal'],
      ).toEqual(PREMIUM);
    });

    it('useKnownBillingAccess lee del store sin disparar ninguna petición', () => {
      useAuthStore.setState({ billingByAccountId: { 'account-1': PREMIUM } });

      const { result } = renderHook(() => useKnownBillingAccess('account-1'), {
        wrapper,
      });

      expect(result.current).toEqual(PREMIUM);
      expect(mockedGetBillingAccess).not.toHaveBeenCalled();
    });

    /** "Todavía no se ha consultado" no es lo mismo que "no tiene plan". */
    it('useKnownBillingAccess devuelve undefined para una cuenta no consultada', () => {
      const { result } = renderHook(
        () => useKnownBillingAccess('account-desconocida'),
        { wrapper },
      );

      expect(result.current).toBeUndefined();
    });
  });

  describe('useCanPerform', () => {
    /**
     * Es la forma correcta de condicionar la interfaz: ninguna pantalla debe preguntar por el
     * NOMBRE del plan, que se rompe con cada plan nuevo y obliga a desplegar esta app cada vez
     * que ventas mueve un beneficio.
     */
    it('responde con la acción del plan de la cuenta activa', () => {
      useAuthStore.setState({ billingByAccountId: { 'account-1': PREMIUM } });
      setActiveAccount('account-1');

      const { result: puede } = renderHook(() => useCanPerform('preApproval'), {
        wrapper,
      });
      const { result: noPuede } = renderHook(
        () => useCanPerform('customBranding'),
        { wrapper },
      );

      expect(puede.current).toBe(true);
      expect(noPuede.current).toBe(false);
    });

    /** Ante la duda no se ofrece una acción que el backend podría rechazar con un 403. */
    it('responde false mientras no se conozca el estado de la cuenta', () => {
      setActiveAccount('account-sin-consultar');

      const { result } = renderHook(() => useCanPerform('bulkSigning'), {
        wrapper,
      });

      expect(result.current).toBe(false);
    });

    it('cambia de respuesta al cambiar de cuenta activa', () => {
      useAuthStore.setState({
        billingByAccountId: {
          'account-personal': SIN_PERFIL,
          'account-org': PREMIUM,
        },
      });
      setActiveAccount('account-personal');

      const { result, rerender } = renderHook(
        () => useCanPerform('bulkSigning'),
        { wrapper },
      );

      expect(result.current).toBe(false);

      setActiveAccount('account-org', 'ORGANIZATION', 'org-1');
      rerender();

      expect(result.current).toBe(true);
    });
  });

  describe('espera de la activación tras Checkout', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    /**
     * El retorno de Stripe no confirma nada: quien activa el perfil es el webhook `invoice.paid`,
     * que llega unos segundos después. Sin insistir, el usuario vuelve de pagar y ve "pendiente"
     * hasta que recargue a mano.
     */
    it('vuelve a preguntar mientras la suscripción no esté activa', async () => {
      mockedGetBillingAccess.mockResolvedValue(
        buildBillingAccess({
          hasActiveSubscription: false,
          status: 'INCOMPLETE',
        }),
      );
      setActiveAccount('account-1');

      const { result } = renderHook(
        () => useBillingAccess({ awaitActivation: true }),
        { wrapper },
      );

      await waitFor(() => expect(result.current.data).toBeDefined());
      expect(mockedGetBillingAccess).toHaveBeenCalledTimes(1);

      await act(async () => {
        jest.advanceTimersByTime(ACTIVATION_POLL_INTERVAL_MS);
      });

      await waitFor(() =>
        expect(mockedGetBillingAccess).toHaveBeenCalledTimes(2),
      );
    });

    /** Dejar de insistir cuando ya llegó el webhook es el resultado esperado, no un abandono. */
    it('deja de preguntar en cuanto la suscripción queda activa', async () => {
      mockedGetBillingAccess.mockResolvedValue(buildBillingAccess());
      setActiveAccount('account-1');

      const { result } = renderHook(
        () => useBillingAccess({ awaitActivation: true }),
        { wrapper },
      );

      await waitFor(() =>
        expect(result.current.data?.hasActiveSubscription).toBe(true),
      );

      await act(async () => {
        jest.advanceTimersByTime(ACTIVATION_POLL_INTERVAL_MS * 3);
      });

      expect(mockedGetBillingAccess).toHaveBeenCalledTimes(1);
    });

    /** Fuera del retorno de Checkout no hay ningún cambio de estado que esperar. */
    it('no insiste cuando no se está esperando la activación', async () => {
      mockedGetBillingAccess.mockResolvedValue(
        buildBillingAccess({ hasActiveSubscription: false }),
      );
      setActiveAccount('account-1');

      const { result } = renderHook(() => useBillingAccess(), { wrapper });

      await waitFor(() => expect(result.current.data).toBeDefined());

      await act(async () => {
        jest.advanceTimersByTime(ACTIVATION_POLL_INTERVAL_MS * 3);
      });

      expect(mockedGetBillingAccess).toHaveBeenCalledTimes(1);
    });
  });
});

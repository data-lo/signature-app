import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import toast from 'react-hot-toast';

import { switchActiveAccountAction } from '@/app/server-actions/accounts/switch-active-account.server-action';
import { PermissionProvider } from '@/components/authorization/PermissionProvider';
import {
  createOrganizationRequest,
  type AccountData,
} from '@/lib/api/accounts';
import { getBillingAccessRequest } from '@/lib/api/billing';
import { ORGANIZATION_WITHOUT_PLAN } from '@/lib/api/billing.fixtures';
import type { AuthorizationContext } from '@/lib/authorization/authorization.types';
import { billingAccessQueryKey } from '@/lib/hooks/useBillingAccess';
import { useAuthStore } from '@/lib/store/useAuthStore';

import {
  ORGANIZATION_CREATED_MESSAGE,
  ORGANIZATION_NOT_ACTIVATED_MESSAGE,
  useCreateOrganization,
} from './useCreateOrganization';

const mockPush = jest.fn();
const mockRefresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));
jest.mock('@/lib/api/accounts');
jest.mock('@/lib/api/billing');
jest.mock(
  '@/app/server-actions/accounts/switch-active-account.server-action',
  () => ({ switchActiveAccountAction: jest.fn() }),
);
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

const mockedCreateOrganizationRequest = createOrganizationRequest as jest.Mock;
const mockedGetBillingAccess = getBillingAccessRequest as jest.Mock;
const mockedSwitchAction = switchActiveAccountAction as jest.Mock;

const PERSONAL_ACCOUNT_ID = 'personal-1';

const NEW_ORG: AccountData = {
  id: 'org-account-1',
  type: 'ORGANIZATION',
  createdAt: '2026-01-01T00:00:00.000Z',
  organizationId: 'org-1',
  organizationDetail: { name: 'Acme Corp S.A. de C.V.' },
  roleId: 'owner-role-1',
  isActive: true,
};

/** El contexto que el servidor resuelve para la organización nueva: su creador es OWNER. */
const OWNER_CONTEXT: AuthorizationContext = {
  accountId: NEW_ORG.id,
  accountType: 'ORGANIZATION',
  organizationId: 'org-1',
  roleId: 'owner-role-1',
  roleName: 'OWNER',
  permissions: [
    'BILLING.READ',
    'BILLING.MANAGE',
    'MEMBER.READ',
    'MEMBER.INVITE',
  ],
};

/** Contexto de la cuenta PERSONAL desde la que se crea la organización. */
const PERSONAL_CONTEXT: AuthorizationContext = {
  accountId: PERSONAL_ACCOUNT_ID,
  accountType: 'PERSONAL',
  organizationId: null,
  roleId: 'owner-role-1',
  roleName: 'OWNER',
  permissions: ['BILLING.READ', 'BILLING.MANAGE', 'DOCUMENT.CREATE'],
};

let queryClient: QueryClient;
/** Cuenta activa en el momento de cada consulta de billing: lo que viajaría en `X-Account-Id`. */
let billingRequestedFor: (string | undefined)[];

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <PermissionProvider initialContext={PERSONAL_CONTEXT}>
        {children}
      </PermissionProvider>
    </QueryClientProvider>
  );
}

/**
 * Lanza el alta de la organización de prueba y espera a que la mutación termine.
 *
 * @param expected - Estado en el que se espera que termine la mutación.
 * @returns El resultado del hook.
 *
 * @example
 * await createOrganization('success');
 */
async function createOrganization(expected: 'success' | 'error') {
  const { result } = renderHook(() => useCreateOrganization(), { wrapper });

  await act(async () => {
    result.current.mutate({
      name: 'Acme',
      organizationName: 'Acme Corp S.A. de C.V.',
    });
  });

  await waitFor(() =>
    expect(
      expected === 'success'
        ? result.current.isSuccess
        : result.current.isError,
    ).toBe(true),
  );

  return result;
}

describe('useCreateOrganization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    billingRequestedFor = [];
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    mockedCreateOrganizationRequest.mockResolvedValue(NEW_ORG);
    mockedSwitchAction.mockResolvedValue({ ok: true, context: OWNER_CONTEXT });
    mockedGetBillingAccess.mockImplementation(async () => {
      billingRequestedFor.push(useAuthStore.getState().activeAccount?.id);
      return ORGANIZATION_WITHOUT_PLAN;
    });
    useAuthStore.setState({
      accountsList: [],
      activeAccount: {
        id: PERSONAL_ACCOUNT_ID,
        accountType: 'PERSONAL',
        organizationId: null,
        roleId: 'owner-role-1',
      },
      billingByAccountId: {},
    });
  });

  describe('cuando todo sale bien', () => {
    it('agrega la organización al catálogo de cuentas', async () => {
      await createOrganization('success');

      expect(useAuthStore.getState().accountsList).toHaveLength(1);
      expect(useAuthStore.getState().accountsList[0].id).toBe(NEW_ORG.id);
    });

    /**
     * El corazón de la historia: la cuenta activa se persiste por el camino oficial, que es el
     * único que escribe la cookie `HttpOnly` que lee el render del servidor. Antes esto se hacía
     * sólo en memoria y Planes se renderizaba con la cuenta anterior.
     */
    it('persiste la cuenta activa con la Server Action que escribe la cookie', async () => {
      await createOrganization('success');

      expect(mockedSwitchAction).toHaveBeenCalledWith(NEW_ORG.id);
    });

    it('deja como cuenta activa la que resolvió el servidor, no la que devolvió el alta', async () => {
      await createOrganization('success');

      expect(useAuthStore.getState().activeAccount).toEqual({
        id: OWNER_CONTEXT.accountId,
        accountType: 'ORGANIZATION',
        organizationId: 'org-1',
        roleId: 'owner-role-1',
      });
    });

    it('refresca el contexto de autorización del dashboard', async () => {
      await createOrganization('success');

      expect(mockRefresh).toHaveBeenCalled();
    });

    /**
     * El `X-Account-Id` lo pone el interceptor leyendo la cuenta activa del store, así que
     * preguntar el billing antes del cambio traería el estado de la cuenta anterior guardado bajo
     * la llave de la nueva.
     */
    it('consulta el billing DESPUÉS del cambio, con la cuenta nueva', async () => {
      await createOrganization('success');

      expect(billingRequestedFor).toEqual([NEW_ORG.id]);
      expect(mockedSwitchAction.mock.invocationCallOrder[0]).toBeLessThan(
        mockedGetBillingAccess.mock.invocationCallOrder[0],
      );
    });

    /** La organización nace sin plan, sin créditos y con todas las acciones deshabilitadas. */
    it('deja cargado el estado de organización sin plan', async () => {
      await createOrganization('success');

      expect(
        queryClient.getQueryData(billingAccessQueryKey(NEW_ORG.id)),
      ).toEqual(ORGANIZATION_WITHOUT_PLAN);
      expect(ORGANIZATION_WITHOUT_PLAN.currentPlanType).toBeNull();
      expect(ORGANIZATION_WITHOUT_PLAN.creditsAvailable).toBe(0);
      expect(ORGANIZATION_WITHOUT_PLAN.actions.signSimpleAndAdvanced).toBe(
        false,
      );
    });

    it('navega a Planes y lo anuncia', async () => {
      await createOrganization('success');

      expect(toast.success).toHaveBeenCalledWith(ORGANIZATION_CREATED_MESSAGE);
      expect(mockPush).toHaveBeenCalledWith('/dashboard/plans');
    });

    /** Planes monta la misma consulta; quedarse en el formulario sería mucho peor. */
    it('navega a Planes aunque la consulta de billing falle', async () => {
      mockedGetBillingAccess.mockRejectedValue(new Error('billing caído'));

      await createOrganization('success');

      expect(mockPush).toHaveBeenCalledWith('/dashboard/plans');
    });
  });

  describe('cuando no se puede persistir la cuenta activa', () => {
    beforeEach(() => {
      mockedSwitchAction.mockResolvedValue({
        ok: false,
        message: 'No se pudo cambiar de cuenta. Intenta de nuevo.',
      });
    });

    it('no navega a Planes y explica qué pasó', async () => {
      await createOrganization('success');

      expect(mockPush).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith(
        ORGANIZATION_NOT_ACTIVATED_MESSAGE,
      );
      expect(toast.success).not.toHaveBeenCalled();
    });

    /**
     * El criterio de aceptación: no queda una cuenta activa inconsistente. La cookie no se
     * escribió, así que el store tampoco puede moverse.
     */
    it('deja la cuenta activa del cliente donde estaba', async () => {
      await createOrganization('success');

      expect(useAuthStore.getState().activeAccount?.id).toBe(
        PERSONAL_ACCOUNT_ID,
      );
    });

    /** La ruta recuperable: la organización existe y el selector de cuentas la ofrece. */
    it('conserva la organización en el catálogo para poder entrar desde el selector', async () => {
      await createOrganization('success');

      expect(useAuthStore.getState().accountsList[0].id).toBe(NEW_ORG.id);
    });

    it('no consulta el billing de una cuenta que no quedó activa', async () => {
      await createOrganization('success');

      expect(mockedGetBillingAccess).not.toHaveBeenCalled();
    });
  });

  describe('cuando la membresía creada no sirve para contratar', () => {
    /**
     * No debería ocurrir —el backend crea la organización con su creador como OWNER en una
     * transacción—, pero es lo que la comprobación existe para atrapar: mandar a Planes a quien
     * no puede contratar es el callejón sin salida que esta historia viene a quitar.
     */
    it('no navega a Planes si el creador no quedó como propietario', async () => {
      mockedSwitchAction.mockResolvedValue({
        ok: true,
        context: { ...OWNER_CONTEXT, roleName: 'MEMBER' },
      });

      await createOrganization('success');

      expect(mockPush).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('no quedaste como su propietario'),
      );
    });

    it('no navega a Planes si su rol no concede los permisos de facturación', async () => {
      mockedSwitchAction.mockResolvedValue({
        ok: true,
        context: { ...OWNER_CONTEXT, permissions: ['MEMBER.READ'] },
      });

      await createOrganization('success');

      expect(mockPush).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('no permite contratar su plan'),
      );
    });

    /**
     * El servidor se quedó en otra cuenta: la cookie no acabó apuntando a la organización recién
     * creada, que es exactamente el desajuste que provocaba el rebote a acceso no autorizado.
     */
    it('no navega a Planes si el servidor quedó en otra cuenta', async () => {
      mockedSwitchAction.mockResolvedValue({
        ok: true,
        context: { ...OWNER_CONTEXT, accountId: PERSONAL_ACCOUNT_ID },
      });

      await createOrganization('success');

      expect(mockPush).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('no se pudo activar'),
      );
    });
  });

  describe('cuando el alta falla', () => {
    it('muestra el mensaje del backend y no toca nada más', async () => {
      mockedCreateOrganizationRequest.mockRejectedValue({
        response: {
          data: { message: 'Ya tienes una organización con ese nombre' },
        },
      });

      await createOrganization('error');

      expect(toast.error).toHaveBeenCalledWith(
        'Ya tienes una organización con ese nombre',
      );
      expect(useAuthStore.getState().accountsList).toHaveLength(0);
      expect(useAuthStore.getState().activeAccount?.id).toBe(
        PERSONAL_ACCOUNT_ID,
      );
      expect(mockedSwitchAction).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
      expect(mockedGetBillingAccess).not.toHaveBeenCalled();
    });

    it('muestra el mensaje genérico si el backend no manda uno', async () => {
      mockedCreateOrganizationRequest.mockRejectedValue(new Error('network'));

      await createOrganization('error');

      expect(toast.error).toHaveBeenCalledWith(
        'Ocurrió un error al crear la organización. Intenta de nuevo.',
      );
    });
  });
});

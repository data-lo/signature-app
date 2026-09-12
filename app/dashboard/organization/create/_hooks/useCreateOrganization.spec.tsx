import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import toast from 'react-hot-toast';
import {
  ORGANIZATION_CREATED_MESSAGE,
  useCreateOrganization,
} from './useCreateOrganization';
import { createOrganizationRequest } from '@/lib/api/accounts';
import { getBillingAccessRequest } from '@/lib/api/billing';
import {
  ORGANIZATION_WITHOUT_PLAN,
  buildBillingAccess,
} from '@/lib/api/billing.fixtures';
import { billingAccessQueryKey } from '@/lib/hooks/useBillingAccess';
import { useAuthStore } from '@/lib/store/useAuthStore';
import type { AccountData } from '@/lib/api/accounts';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));
jest.mock('@/lib/api/accounts');
jest.mock('@/lib/api/billing');
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

const mockedCreateOrganizationRequest =
  createOrganizationRequest as jest.Mock;
const mockedGetBillingAccess = getBillingAccessRequest as jest.Mock;

const PERSONAL_ACCOUNT_ID = 'personal-1';

const NEW_ORG: AccountData = {
  id: 'org-1',
  type: 'ORGANIZATION',
  createdAt: '2026-01-01T00:00:00.000Z',
  organizationId: 'org-1',
  organizationDetail: { name: 'Acme Corp S.A. de C.V.' },
  roleId: 'admin-role-1',
  isActive: true,
};

let queryClient: QueryClient;
/** Cuenta activa en el momento de cada consulta de billing: lo que viajaría en `X-Account-Id`. */
let billingRequestedFor: string[];

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
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

  act(() => {
    result.current.mutate({
      name: 'Acme',
      organizationName: 'Acme Corp S.A. de C.V.',
    });
  });

  await waitFor(() =>
    expect(
      expected === 'success' ? result.current.isSuccess : result.current.isError,
    ).toBe(true),
  );

  return result;
}

describe('useCreateOrganization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    billingRequestedFor = [];
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    mockedGetBillingAccess.mockImplementation(async () => {
      billingRequestedFor.push(useAuthStore.getState().activeAccount!.id);
      return ORGANIZATION_WITHOUT_PLAN;
    });
    useAuthStore.setState({
      accountsList: [],
      activeAccount: {
        id: PERSONAL_ACCOUNT_ID,
        accountType: 'PERSONAL',
        organizationId: null,
        roleId: 'OWNER',
      },
      billingByAccountId: {},
    });
  });

  describe('al crear la organización', () => {
    beforeEach(() => {
      mockedCreateOrganizationRequest.mockResolvedValue(NEW_ORG);
    });

    it('la inserta en accountsList y la vuelve la cuenta activa', async () => {
      await createOrganization('success');

      expect(useAuthStore.getState().accountsList).toHaveLength(1);
      expect(useAuthStore.getState().accountsList[0].id).toBe('org-1');
      expect(useAuthStore.getState().activeAccount).toEqual({
        id: 'org-1',
        accountType: 'ORGANIZATION',
        organizationId: 'org-1',
        roleId: 'admin-role-1',
      });
    });

    it('consulta el billing de la organización nueva con su propio accountId', async () => {
      await createOrganization('success');

      expect(billingRequestedFor).toEqual(['org-1']);
      expect(
        queryClient.getQueryData(billingAccessQueryKey('org-1')),
      ).toEqual(ORGANIZATION_WITHOUT_PLAN);
    });

    it('invalida el billing de la cuenta anterior', async () => {
      queryClient.setQueryData(
        billingAccessQueryKey(PERSONAL_ACCOUNT_ID),
        buildBillingAccess(),
      );

      await createOrganization('success');

      expect(
        queryClient.getQueryState(billingAccessQueryKey(PERSONAL_ACCOUNT_ID))
          ?.isInvalidated,
      ).toBe(true);
    });

    it('redirige a Planes y lo anuncia', async () => {
      await createOrganization('success');

      expect(toast.success).toHaveBeenCalledWith(ORGANIZATION_CREATED_MESSAGE);
      expect(mockPush).toHaveBeenCalledWith('/dashboard/plans');
      expect(mockPush).not.toHaveBeenCalledWith('/dashboard/documents/create');
    });

    /** La guarda de rutas vuelve a pedir el billing; el usuario no se queda en el formulario. */
    it('redirige a Planes aunque la consulta de billing falle', async () => {
      mockedGetBillingAccess.mockRejectedValue(new Error('billing caído'));

      await createOrganization('success');

      expect(mockPush).toHaveBeenCalledWith('/dashboard/plans');
    });
  });

  it('al fallar: muestra el mensaje de error del backend y no toca el store', async () => {
    mockedCreateOrganizationRequest.mockRejectedValue({
      response: { data: { message: 'Ya tienes una organización con ese nombre' } },
    });

    await createOrganization('error');

    expect(toast.error).toHaveBeenCalledWith(
      'Ya tienes una organización con ese nombre',
    );
    expect(useAuthStore.getState().accountsList).toHaveLength(0);
    expect(useAuthStore.getState().activeAccount?.id).toBe(PERSONAL_ACCOUNT_ID);
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockedGetBillingAccess).not.toHaveBeenCalled();
  });

  it('al fallar sin mensaje del backend: muestra el mensaje genérico', async () => {
    mockedCreateOrganizationRequest.mockRejectedValue(new Error('network'));

    await createOrganization('error');

    expect(toast.error).toHaveBeenCalledWith(
      'Ocurrió un error al crear la organización. Intenta de nuevo.',
    );
  });
});

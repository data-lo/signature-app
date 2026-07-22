import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import toast from 'react-hot-toast';
import { useCreateOrganization } from './useCreateOrganization';
import { createOrganizationRequest } from '@/lib/api/accounts';
import { useAuthStore } from '@/lib/store/useAuthStore';
import type { AccountData } from '@/lib/api/accounts';

const push = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));
jest.mock('@/lib/api/accounts');
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

const mockedCreateOrganizationRequest =
  createOrganizationRequest as jest.Mock;

const NEW_ORG: AccountData = {
  id: 'org-1',
  type: 'ORGANIZATION',
  createdAt: '2026-01-01T00:00:00.000Z',
  organizationId: 'org-1',
  organizationDetail: { name: 'Acme Corp S.A. de C.V.' },
  roleId: 'admin-role-1',
  isActive: true,
};

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useCreateOrganization', () => {
  beforeEach(() => {
    push.mockReset();
    mockedCreateOrganizationRequest.mockReset();
    useAuthStore.setState({ accountsList: [], activeAccount: null });
  });

  it('al éxito: inserta la cuenta en accountsList, la vuelve activa, muestra el toast y redirige a /home', async () => {
    mockedCreateOrganizationRequest.mockResolvedValue(NEW_ORG);
    const { result } = renderHook(() => useCreateOrganization(), { wrapper });

    act(() => {
      result.current.mutate({
        name: 'Acme',
        organizationName: 'Acme Corp S.A. de C.V.',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(useAuthStore.getState().accountsList).toHaveLength(1);
    expect(useAuthStore.getState().accountsList[0].id).toBe('org-1');
    expect(useAuthStore.getState().activeAccount).toEqual({
      id: 'org-1',
      accountType: 'ORGANIZATION',
      organizationId: 'org-1',
      roleId: 'admin-role-1',
    });
    expect(toast.success).toHaveBeenCalledWith(
      'Puedes alternar entre tu cuenta personal y la de la organización',
    );
    expect(push).toHaveBeenCalledWith('/home');
  });

  it('al fallar: muestra el mensaje de error del backend y no toca el store', async () => {
    mockedCreateOrganizationRequest.mockRejectedValue({
      response: { data: { message: 'Ya tienes una organización con ese nombre' } },
    });
    const { result } = renderHook(() => useCreateOrganization(), { wrapper });

    act(() => {
      result.current.mutate({
        name: 'Acme',
        organizationName: 'Acme Corp S.A. de C.V.',
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(toast.error).toHaveBeenCalledWith(
      'Ya tienes una organización con ese nombre',
    );
    expect(useAuthStore.getState().accountsList).toHaveLength(0);
    expect(push).not.toHaveBeenCalled();
  });

  it('al fallar sin mensaje del backend: muestra el mensaje genérico', async () => {
    mockedCreateOrganizationRequest.mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useCreateOrganization(), { wrapper });

    act(() => {
      result.current.mutate({
        name: 'Acme',
        organizationName: 'Acme Corp S.A. de C.V.',
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(toast.error).toHaveBeenCalledWith(
      'Ocurrió un error al crear la organización. Intenta de nuevo.',
    );
  });
});

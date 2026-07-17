import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import toast from 'react-hot-toast';
import { useInviteMember } from './useInviteMember';
import { inviteMemberRequest } from '@/lib/api/accounts';

jest.mock('@/lib/api/accounts');
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

const mockedInviteMemberRequest = inviteMemberRequest as jest.Mock;

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useInviteMember', () => {
  beforeEach(() => {
    mockedInviteMemberRequest.mockReset();
  });

  it('al éxito: muestra el toast de éxito', async () => {
    mockedInviteMemberRequest.mockResolvedValue(undefined);
    const { result } = renderHook(() => useInviteMember(), { wrapper });

    act(() => {
      result.current.mutate({
        email: 'nuevo@empresa.com',
        roleId: 'role-1',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(toast.success).toHaveBeenCalledWith(
      'Invitación enviada correctamente',
    );
  });

  it('al fallar: muestra el mensaje de error del backend', async () => {
    mockedInviteMemberRequest.mockRejectedValue({
      response: { data: { message: 'No eres ADMIN de esta organización' } },
    });
    const { result } = renderHook(() => useInviteMember(), { wrapper });

    act(() => {
      result.current.mutate({ email: 'nuevo@empresa.com', roleId: 'role-1' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(toast.error).toHaveBeenCalledWith(
      'No eres ADMIN de esta organización',
    );
  });

  it('al fallar sin mensaje del backend: muestra el mensaje genérico', async () => {
    mockedInviteMemberRequest.mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useInviteMember(), { wrapper });

    act(() => {
      result.current.mutate({ email: 'nuevo@empresa.com', roleId: 'role-1' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(toast.error).toHaveBeenCalledWith(
      'Ocurrió un error al enviar la invitación. Intenta de nuevo.',
    );
  });
});

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, type AxiosResponse } from 'axios';
import type { ReactNode } from 'react';
import { useDocumentDetail } from './useDocumentDetail';
import { getDocumentDetailRequest } from '../_requests';
import { useAuthStore } from '@/lib/store/useAuthStore';

jest.mock('../_requests');

const mockedGetDocumentDetailRequest = getDocumentDetailRequest as jest.Mock;

let queryClient: QueryClient;

/** Sin `retry` en los valores por omisión: la política que se prueba es la del propio hook. */
function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function setActiveAccount(id: string | null) {
  useAuthStore.setState({
    activeAccount: id
      ? {
          id,
          accountType: 'ORGANIZATION',
          organizationId: `org-of-${id}`,
          roleId: 'role-1',
        }
      : null,
  });
}

describe('useDocumentDetail', () => {
  beforeEach(() => {
    queryClient = new QueryClient();
    mockedGetDocumentDetailRequest.mockReset();
    mockedGetDocumentDetailRequest.mockResolvedValue({ id: 'doc-1' });
  });

  it('no consulta hasta que la cuenta activa se hidrata: sin X-Account-Id el backend responde 403', () => {
    setActiveAccount(null);

    const { result } = renderHook(() => useDocumentDetail('doc-1'), {
      wrapper,
    });

    expect(result.current.isPending).toBe(true);
    expect(mockedGetDocumentDetailRequest).not.toHaveBeenCalled();
  });

  it('guarda el detalle bajo la cuenta activa, para que cambiar de cuenta no reutilice el de la anterior', async () => {
    setActiveAccount('account-1');

    const { result } = renderHook(() => useDocumentDetail('doc-1'), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(
      queryClient.getQueryData(['documentDetail', 'doc-1', 'account-1']),
    ).toEqual({ id: 'doc-1' });
  });

  it('no reintenta un 403: responde en el primer intento', async () => {
    setActiveAccount('account-1');
    mockedGetDocumentDetailRequest.mockRejectedValue(
      new AxiosError('Forbidden', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 403,
        data: {},
      } as AxiosResponse),
    );

    const { result } = renderHook(() => useDocumentDetail('doc-1'), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockedGetDocumentDetailRequest).toHaveBeenCalledTimes(1);
  });
});

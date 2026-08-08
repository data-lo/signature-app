import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useDocuments } from './useDocuments';
import { getDocumentsRequest } from '../_requests';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { ParticipantStatus } from '@/lib/enums/document';

jest.mock('../_requests');

const mockedGetDocumentsRequest = getDocumentsRequest as jest.Mock;

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useDocuments', () => {
  beforeEach(() => {
    mockedGetDocumentsRequest.mockReset();
    mockedGetDocumentsRequest.mockResolvedValue({
      documents: [],
      meta: { total: 0, page: 1, limit: 25, totalPages: 0, hasNextPage: false, hasPrevPage: false },
    });
    useAuthStore.setState({ activeAccount: null });
  });

  it('bug corregido: no dispara la petición mientras activeAccount aún no hidrata, aunque ya haya email (evita el 400 por falta de X-Account-Id)', () => {
    renderHook(
      () =>
        useDocuments({
          scope: 'participant',
          email: 'user@correo.com',
          status: ParticipantStatus.Pending,
          page: 1,
          limit: 25,
        }),
      { wrapper },
    );

    expect(mockedGetDocumentsRequest).not.toHaveBeenCalled();
  });

  it('dispara la petición una vez que email y activeAccount están listos', async () => {
    useAuthStore.setState({
      activeAccount: {
        id: 'account-1',
        accountType: 'PERSONAL',
        organizationId: null,
        roleId: null,
      },
    });

    renderHook(
      () =>
        useDocuments({
          scope: 'participant',
          email: 'user@correo.com',
          status: ParticipantStatus.Pending,
          page: 1,
          limit: 25,
        }),
      { wrapper },
    );

    await waitFor(() => expect(mockedGetDocumentsRequest).toHaveBeenCalled());
  });

  it('no dispara la petición si falta el email, aunque activeAccount ya esté listo', () => {
    useAuthStore.setState({
      activeAccount: {
        id: 'account-1',
        accountType: 'PERSONAL',
        organizationId: null,
        roleId: null,
      },
    });

    renderHook(
      () =>
        useDocuments({
          scope: 'participant',
          email: undefined,
          status: ParticipantStatus.Pending,
          page: 1,
          limit: 25,
        }),
      { wrapper },
    );

    expect(mockedGetDocumentsRequest).not.toHaveBeenCalled();
  });
});

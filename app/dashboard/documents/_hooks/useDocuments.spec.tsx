import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useDocuments } from './useDocuments';
import { getDocumentsRequest } from '../_requests';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { ParticipantStatus } from '@/lib/enums/document';

jest.mock('../_requests');
jest.mock('@/lib/hooks/useCurrentUser');

const mockedGetDocumentsRequest = getDocumentsRequest as jest.Mock;
const mockedUseCurrentUser = useCurrentUser as jest.Mock;

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function setActiveAccount() {
  useAuthStore.setState({
    activeAccount: {
      id: 'account-1',
      accountType: 'PERSONAL',
      organizationId: null,
      roleId: null,
    },
  });
}

describe('useDocuments', () => {
  beforeEach(() => {
    mockedGetDocumentsRequest.mockReset();
    mockedGetDocumentsRequest.mockResolvedValue({
      documents: [],
      meta: { total: 0, page: 1, limit: 25, totalPages: 0, hasNextPage: false, hasPrevPage: false },
    });
    mockedUseCurrentUser.mockReturnValue({
      data: { email: 'user@correo.com' },
    });
    useAuthStore.setState({ activeAccount: null });
  });

  it('bug corregido: no dispara la petición mientras activeAccount aún no hidrata, aunque ya haya email (evita el 400 por falta de X-Account-Id)', () => {
    renderHook(() => useDocuments({ type: 'to-sign', page: 1, limit: 25 }), {
      wrapper,
    });

    expect(mockedGetDocumentsRequest).not.toHaveBeenCalled();
  });

  it('dispara la petición una vez que email y activeAccount están listos', async () => {
    setActiveAccount();

    renderHook(() => useDocuments({ type: 'to-sign', page: 1, limit: 25 }), {
      wrapper,
    });

    await waitFor(() => expect(mockedGetDocumentsRequest).toHaveBeenCalled());
  });

  it('no dispara la petición si falta el email, aunque activeAccount ya esté listo', () => {
    setActiveAccount();
    mockedUseCurrentUser.mockReturnValue({ data: undefined });

    renderHook(() => useDocuments({ type: 'to-sign', page: 1, limit: 25 }), {
      wrapper,
    });

    expect(mockedGetDocumentsRequest).not.toHaveBeenCalled();
  });

  it('"Por firmar" consulta como participante con status pendiente', async () => {
    setActiveAccount();

    renderHook(() => useDocuments({ type: 'to-sign', page: 1, limit: 25 }), {
      wrapper,
    });

    await waitFor(() =>
      expect(mockedGetDocumentsRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          participantEmail: 'user@correo.com',
          email: undefined,
          status: ParticipantStatus.Pending,
        }),
      ),
    );
  });

  it('"Completados" consulta como participante con status firmado', async () => {
    setActiveAccount();

    renderHook(() => useDocuments({ type: 'completed', page: 1, limit: 25 }), {
      wrapper,
    });

    await waitFor(() =>
      expect(mockedGetDocumentsRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          participantEmail: 'user@correo.com',
          email: undefined,
          status: ParticipantStatus.Signed,
        }),
      ),
    );
  });

  it('"Enviados para firma" consulta como creador y sin status', async () => {
    setActiveAccount();

    renderHook(() => useDocuments({ type: 'sent', page: 1, limit: 10 }), {
      wrapper,
    });

    await waitFor(() =>
      expect(mockedGetDocumentsRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'user@correo.com',
          participantEmail: undefined,
          status: undefined,
        }),
      ),
    );
  });
});

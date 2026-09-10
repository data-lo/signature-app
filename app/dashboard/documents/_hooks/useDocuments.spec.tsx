import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useDocuments } from './useDocuments';
import { getDocumentsRequest } from '../_requests';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { DocumentView } from '@/lib/enums/document';
import { DEFAULT_DOCUMENTS_FILTERS } from '../_config/filters';

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
      items: [],
      pagination: { page: 1, limit: 25, total: 0, totalPages: 0 },
    });
    useAuthStore.setState({ activeAccount: null });
  });

  /**
   * Bug corregido que sigue vigente: `activeAccount` se hidrata desde el store persistido (ver
   * AuthProvider) y disparar antes mandaba la petición sin X-Account-Id, que el backend rechaza
   * con 400 en cada carga inicial del dashboard.
   */
  it('no dispara la petición mientras activeAccount aún no hidrata', () => {
    renderHook(() => useDocuments({ page: 1, limit: 25 }), { wrapper });

    expect(mockedGetDocumentsRequest).not.toHaveBeenCalled();
  });

  it('dispara la petición en cuanto hay cuenta activa', async () => {
    setActiveAccount();

    renderHook(() => useDocuments({ page: 1, limit: 25 }), { wrapper });

    await waitFor(() => expect(mockedGetDocumentsRequest).toHaveBeenCalled());
  });

  /**
   * El hook dejó de resolver el correo del usuario para mandarlo como `participantEmail`: ahora
   * lo resuelve el servidor desde el token. Es lo que impide pedir la bandeja de otra persona, y
   * de paso quita una espera —`useCurrentUser`— que retrasaba la primera consulta.
   */
  it('no manda el correo del usuario: la bandeja la resuelve el servidor', async () => {
    setActiveAccount();

    renderHook(() => useDocuments({ page: 1, limit: 25 }), { wrapper });

    await waitFor(() => expect(mockedGetDocumentsRequest).toHaveBeenCalled());
    const [params] = mockedGetDocumentsRequest.mock.calls[0];
    expect(params).not.toHaveProperty('participantEmail');
    expect(params).not.toHaveProperty('email');
  });

  it('consulta por omisión lo que espera una acción del usuario', async () => {
    setActiveAccount();

    renderHook(() => useDocuments({ page: 1, limit: 25 }), { wrapper });

    await waitFor(() =>
      expect(mockedGetDocumentsRequest).toHaveBeenCalledWith({
        filters: DEFAULT_DOCUMENTS_FILTERS,
        page: 1,
        limit: 25,
      }),
    );
  });

  it('pasa los filtros tal cual, sin traducirlos', async () => {
    setActiveAccount();
    const filters = {
      ...DEFAULT_DOCUMENTS_FILTERS,
      view: DocumentView.CreatedByMe,
      search: 'contrato',
    };

    renderHook(() => useDocuments({ filters, page: 2, limit: 10 }), {
      wrapper,
    });

    await waitFor(() =>
      expect(mockedGetDocumentsRequest).toHaveBeenCalledWith({
        filters,
        page: 2,
        limit: 10,
      }),
    );
  });

  /**
   * La caché se llama `documents` y lleva la cuenta activa: con la clave anterior
   * (`myDocuments`, más el `type` de la sección) cada pantalla tenía su propia entrada, y una
   * lista podía quedarse mostrando documentos de la cuenta anterior tras cambiar de cuenta.
   */
  it('separa la caché por cuenta activa', async () => {
    setActiveAccount();
    const { rerender } = renderHook(
      () => useDocuments({ page: 1, limit: 25 }),
      { wrapper },
    );
    await waitFor(() => expect(mockedGetDocumentsRequest).toHaveBeenCalled());

    useAuthStore.setState({
      activeAccount: {
        id: 'account-2',
        accountType: 'ORGANIZATION',
        organizationId: 'org-1',
        roleId: null,
      },
    });
    rerender();

    await waitFor(() =>
      expect(mockedGetDocumentsRequest).toHaveBeenCalledTimes(2),
    );
  });
});

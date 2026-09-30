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

  /**
   * Al pasar de página se conserva la respuesta anterior como placeholder —sólo para que los
   * controles sepan cuántas páginas hay— y queda marcada con `isPlaceholderData`, que es lo que
   * la pantalla usa para no pintarla como definitiva.
   */
  describe('transición entre páginas', () => {
    const PAGE_1 = {
      items: [{ id: 'doc-1' }],
      pagination: { page: 1, limit: 25, total: 30, totalPages: 2 },
    };
    const PAGE_2 = {
      items: [{ id: 'doc-26' }],
      pagination: { page: 2, limit: 25, total: 30, totalPages: 2 },
    };

    it('pide la página nueva y marca como placeholder la anterior mientras llega', async () => {
      setActiveAccount();
      let resolvePage2!: (value: typeof PAGE_2) => void;
      mockedGetDocumentsRequest.mockImplementation(({ page }) =>
        page === 1
          ? Promise.resolve(PAGE_1)
          : new Promise((resolve) => {
              resolvePage2 = resolve;
            }),
      );

      const { result, rerender } = renderHook(
        ({ page }: { page: number }) => useDocuments({ page, limit: 25 }),
        { wrapper, initialProps: { page: 1 } },
      );
      await waitFor(() => expect(result.current.data).toEqual(PAGE_1));

      rerender({ page: 2 });

      await waitFor(() =>
        expect(mockedGetDocumentsRequest).toHaveBeenLastCalledWith({
          filters: DEFAULT_DOCUMENTS_FILTERS,
          page: 2,
          limit: 25,
        }),
      );
      expect(result.current.isPlaceholderData).toBe(true);
      expect(result.current.data).toEqual(PAGE_1);

      resolvePage2(PAGE_2);

      await waitFor(() => expect(result.current.data).toEqual(PAGE_2));
      expect(result.current.isPlaceholderData).toBe(false);
    });

    /** Con otra cuenta, reutilizar la respuesta anterior sería mostrar documentos ajenos. */
    it('no conserva la respuesta anterior al cambiar de cuenta', async () => {
      setActiveAccount();
      mockedGetDocumentsRequest.mockResolvedValueOnce(PAGE_1);
      mockedGetDocumentsRequest.mockImplementation(() => new Promise(() => {}));

      const { result, rerender } = renderHook(
        () => useDocuments({ page: 1, limit: 25 }),
        { wrapper },
      );
      await waitFor(() => expect(result.current.data).toEqual(PAGE_1));

      useAuthStore.setState({
        activeAccount: {
          id: 'account-2',
          accountType: 'ORGANIZATION',
          organizationId: 'org-1',
          roleId: null,
        },
      });
      rerender();

      await waitFor(() => expect(result.current.isPending).toBe(true));
      expect(result.current.data).toBeUndefined();
    });

    it.each([
      [
        'los filtros',
        {
          filters: { ...DEFAULT_DOCUMENTS_FILTERS, search: 'contrato' },
          limit: 25,
        },
      ],
      [
        'el tamaño de página',
        { filters: DEFAULT_DOCUMENTS_FILTERS, limit: 50 },
      ],
    ])('no conserva la respuesta anterior si cambian %s', async (_, next) => {
      setActiveAccount();
      mockedGetDocumentsRequest.mockResolvedValueOnce(PAGE_1);
      mockedGetDocumentsRequest.mockImplementation(() => new Promise(() => {}));

      const { result, rerender } = renderHook(
        (props: { filters: typeof DEFAULT_DOCUMENTS_FILTERS; limit: number }) =>
          useDocuments({ ...props, page: 1 }),
        {
          wrapper,
          initialProps: { filters: DEFAULT_DOCUMENTS_FILTERS, limit: 25 },
        },
      );
      await waitFor(() => expect(result.current.data).toEqual(PAGE_1));

      rerender(next);

      await waitFor(() => expect(result.current.isPending).toBe(true));
      expect(result.current.data).toBeUndefined();
    });
  });
});

import userEvent from '@testing-library/user-event';
import { act, renderWithProviders, screen, waitFor } from '@/test-utils';
import DocumentsView from './DocumentsView';
import { getDocumentsRequest } from '../_requests';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { DocumentStatus } from '@/lib/enums/document';

/**
 * Sólo se sustituye el borde de red. A diferencia de `DocumentsView.spec.tsx` —que mockea
 * `useDocuments` para hablar de la pantalla— acá se dejan los hooks reales encadenados:
 * `DocumentsView` → `useDocumentsListState` → `useDocuments` → React Query → el store de la
 * cuenta activa. Es la única forma de comprobar lo que reportó el bug: que cambiar de cuenta
 * consulta otra vez y cambia lo que se ve.
 */
jest.mock('../_requests');
jest.mock('../_hooks/useDownloadDocument', () => ({
  useDownloadDocument: () => ({
    mutate: jest.fn(),
    isPending: false,
    variables: undefined,
  }),
}));
jest.mock('../[documentId]/_hooks/useDocumentDetail', () => ({
  useDocumentDetail: () => ({ data: undefined, isLoading: false }),
}));

const searchParams = new URLSearchParams();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => searchParams,
}));

const mockedGetDocumentsRequest = getDocumentsRequest as jest.Mock;

function buildDocument(fileName: string) {
  return {
    id: fileName,
    fileName,
    fileType: 'application/pdf',
    signers: ['Ana López'],
    spectators: [],
    creator: 'Ana López',
    creatorRfc: null,
    totalPages: 1,
    status: DocumentStatus.Pending,
    createdAt: new Date(2026, 0, 1).toISOString(),
    signedAt: null,
  };
}

/**
 * La siguiente respuesta del backend. `pagination` se puede ajustar para tener más de una página:
 * es lo que habilita el botón de "Página siguiente" de la tabla.
 */
function givenDocuments(
  fileName: string,
  pagination: { page?: number; totalPages?: number } = {},
) {
  mockedGetDocumentsRequest.mockResolvedValueOnce({
    items: [buildDocument(fileName)],
    pagination: {
      page: pagination.page ?? 1,
      limit: 25,
      total: pagination.totalPages ? pagination.totalPages * 25 : 1,
      totalPages: pagination.totalPages ?? 1,
    },
  });
}

/**
 * Cambia la cuenta activa como lo hace el switcher: escribiendo en el store. Va dentro de `act`
 * porque el componente ya está montado y esta escritura dispara el re-render y la consulta nueva.
 */
function givenActiveAccount(id: string, organizationId: string | null = null) {
  act(() => {
    useAuthStore.setState({
      activeAccount: {
        id,
        accountType: organizationId ? 'ORGANIZATION' : 'PERSONAL',
        organizationId,
        roleId: null,
      },
    });
  });
}

describe('DocumentsView al cambiar de cuenta activa', () => {
  beforeEach(() => {
    mockedGetDocumentsRequest.mockReset();
    givenActiveAccount('cuenta-personal-1');
  });

  /**
   * Bug: "El listado de documentos no se actualiza al cambiar de cuenta activa". La consulta lleva
   * la cuenta en su `queryKey`, así que cambiarla tiene que provocar una petición nueva y dejar en
   * pantalla lo que responda — no lo que había.
   */
  it('consulta de nuevo y reemplaza lo que se ve', async () => {
    givenDocuments('personal.pdf');
    renderWithProviders(<DocumentsView />);
    expect(await screen.findByText('personal.pdf')).toBeInTheDocument();

    givenDocuments('de-mi-org.pdf');
    givenActiveAccount('cuenta-org-1', 'org-1');

    expect(await screen.findByText('de-mi-org.pdf')).toBeInTheDocument();
    expect(screen.queryByText('personal.pdf')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(mockedGetDocumentsRequest).toHaveBeenCalledTimes(2),
    );
  });

  /**
   * Mientras llega la respuesta de la cuenta nueva no se enseña la lista anterior: la consulta es
   * otra entrada de caché y nace vacía. Enseñar la de antes sería exactamente el síntoma del bug,
   * sólo que durante unos instantes.
   */
  it('no deja en pantalla los documentos de la cuenta anterior mientras responde la nueva', async () => {
    givenDocuments('personal.pdf');
    renderWithProviders(<DocumentsView />);
    await screen.findByText('personal.pdf');

    // La respuesta de la cuenta nueva queda pendiente a propósito.
    mockedGetDocumentsRequest.mockReturnValueOnce(new Promise(() => {}));
    givenActiveAccount('cuenta-org-1', 'org-1');

    await waitFor(() =>
      expect(screen.queryByText('personal.pdf')).not.toBeInTheDocument(),
    );
  });

  /**
   * Estando en la página 2, cambiar de cuenta vuelve a la 1. Sin esto se pediría la página 2 de
   * una bandeja que puede tener una sola, y la respuesta vacía se lee en pantalla como "esta
   * cuenta no tiene documentos" en vez de "te pasaste de página".
   */
  it('vuelve a la primera página al cambiar de cuenta', async () => {
    const user = userEvent.setup();
    givenDocuments('personal-1.pdf', { totalPages: 2 });
    renderWithProviders(<DocumentsView />);
    await screen.findByText('personal-1.pdf');

    givenDocuments('personal-2.pdf', { page: 2, totalPages: 2 });
    await user.click(screen.getByRole('button', { name: 'Página siguiente' }));
    await screen.findByText('personal-2.pdf');
    expect(mockedGetDocumentsRequest).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
    );

    givenDocuments('de-mi-org.pdf');
    givenActiveAccount('cuenta-org-1', 'org-1');

    await screen.findByText('de-mi-org.pdf');
    expect(mockedGetDocumentsRequest).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1 }),
    );
  });
});

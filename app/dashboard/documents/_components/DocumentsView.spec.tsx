import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor, within } from '@/test-utils';
import DocumentsView from './DocumentsView';
import { useDocuments } from '../_hooks/useDocuments';
import { DocumentStatus, DocumentView } from '@/lib/enums/document';

jest.mock('../_hooks/useDocuments');
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

const push = jest.fn();
const searchParams = new URLSearchParams();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => searchParams,
}));

const mockedUseDocuments = useDocuments as jest.Mock;

/** Los filtros con los que se hizo la última consulta. */
function lastFilters() {
  const calls = mockedUseDocuments.mock.calls;
  return calls[calls.length - 1][0].filters;
}

describe('DocumentsView', () => {
  beforeEach(() => {
    push.mockReset();
    searchParams.delete('view');
    mockedUseDocuments.mockReset();
    mockedUseDocuments.mockReturnValue({
      data: {
        items: [],
        pagination: { page: 1, limit: 25, total: 0, totalPages: 0 },
      },
      isLoading: false,
      isError: false,
    });
  });

  /**
   * Historia "Unificar listado de documentos": lo que antes eran tres rutas hermanas —"Por
   * firmar", "Enviados para firma" y "Completados"— es una sola pantalla, y la sección pasó a ser
   * el filtro `view`.
   */
  it('abre por lo que espera una acción del usuario', () => {
    renderWithProviders(<DocumentsView />);

    expect(screen.getByText(/vista predeterminada/i)).toHaveTextContent(
      'Vista predeterminada: Requieren mi firma o revisión',
    );
    expect(lastFilters().view).toBe(DocumentView.RequiresMySignature);
  });

  /**
   * Las rutas de las secciones anteriores redirigen aquí con su recorte en `?view=` (ver
   * `next.config.ts`): quien llegue por un enlace guardado tiene que ver lo que iba a ver, no una
   * lista genérica.
   */
  it('respeta el recorte que llega en la URL', () => {
    searchParams.set('view', DocumentView.Completed);

    renderWithProviders(<DocumentsView />);

    expect(lastFilters().view).toBe(DocumentView.Completed);
    expect(screen.getByText(/vista: completados/i)).toBeInTheDocument();
  });

  /** Un `view` inventado en la barra de direcciones no rompe la pantalla: se ignora. */
  it('ignora un recorte desconocido y abre con el de por omisión', () => {
    searchParams.set('view', 'inventado');

    renderWithProviders(<DocumentsView />);

    expect(lastFilters().view).toBe(DocumentView.RequiresMySignature);
  });

  it('busca por nombre del documento o participante con una sola caja', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DocumentsView />);

    await user.type(
      screen.getByRole('searchbox', {
        name: /buscar por nombre del documento o participante/i,
      }),
      'contrato',
    );

    await waitFor(() => expect(lastFilters().search).toBe('contrato'));
  });

  /**
   * El diseño pide que cada selección actualice la lista sola: no hay botón "Aplicar" ni
   * borrador que confirmar.
   */
  it('aplica un filtro en cuanto se elige, sin botón de aplicar', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DocumentsView />);

    await user.click(screen.getByRole('button', { name: /filtros/i }));
    const panel = await screen.findByRole('dialog');
    expect(
      within(panel).queryByRole('button', { name: /^aplicar$|^aceptar$/i }),
    ).not.toBeInTheDocument();

    await user.click(within(panel).getByRole('button', { name: 'Creados por mí' }));

    await waitFor(() => expect(lastFilters().view).toBe(DocumentView.CreatedByMe));
  });

  it('acumula varios estados a la vez', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DocumentsView />);

    await user.click(screen.getByRole('button', { name: /filtros/i }));
    const panel = await screen.findByRole('dialog');
    await user.click(within(panel).getByRole('button', { name: 'En progreso' }));
    await user.click(within(panel).getByRole('button', { name: 'Rechazado' }));

    await waitFor(() =>
      expect(lastFilters().statuses).toEqual([
        DocumentStatus.Pending,
        DocumentStatus.Rejected,
      ]),
    );
  });

  /**
   * Sin secciones, un resultado vacío no distingue "no hay documentos" de "quedó un filtro
   * puesto": los chips son lo que hace visible la diferencia, y quitarlos no obliga a reabrir el
   * panel.
   */
  it('muestra cada filtro aplicado como chip removible', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DocumentsView />);

    await user.click(screen.getByRole('button', { name: /filtros/i }));
    const panel = await screen.findByRole('dialog');
    await user.click(within(panel).getByRole('button', { name: 'En progreso' }));
    await user.keyboard('{Escape}');

    const chip = await screen.findByRole('button', {
      name: /quitar filtro: en progreso/i,
    });
    await user.click(chip);

    await waitFor(() => expect(lastFilters().statuses).toEqual([]));
  });

  it('lleva al detalle al seleccionar una fila', async () => {
    mockedUseDocuments.mockReturnValue({
      data: {
        items: [
          {
            id: 'doc-9',
            fileName: 'contrato.pdf',
            fileType: 'application/pdf',
            signers: [],
            spectators: [],
            creator: 'Sara Ramírez',
            totalPages: 1,
            status: DocumentStatus.Pending,
            createdAt: new Date(2026, 2, 15).toISOString(),
            signedAt: null,
          },
        ],
        pagination: { page: 1, limit: 25, total: 1, totalPages: 1 },
      },
      isLoading: false,
      isError: false,
    });
    const user = userEvent.setup();
    renderWithProviders(<DocumentsView />);

    await user.click(screen.getByText('contrato.pdf'));

    expect(push).toHaveBeenCalledWith('/dashboard/documents/doc-9');
  });

  it('ofrece crear un documento desde la misma pantalla', () => {
    renderWithProviders(<DocumentsView />);

    expect(
      screen.getByRole('button', { name: /nuevo documento/i }),
    ).toHaveAttribute('href', '/dashboard/documents/create');
  });
});

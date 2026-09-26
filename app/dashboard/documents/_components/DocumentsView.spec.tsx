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
  /**
   * Historia "Configuración predeterminada del filtro de documentos": la pantalla abre en
   * "Todos", sin recorte de participación y sin filtro de estado, para que la lista inicial traiga
   * los documentos de todos los estados sin que el usuario toque nada.
   */
  it('abre en "Todos", sin recorte ni filtro de estado', () => {
    renderWithProviders(<DocumentsView />);

    expect(screen.getByText(/vista predeterminada/i)).toHaveTextContent(
      'Vista predeterminada: Todos',
    );
    expect(lastFilters().view).toBe(DocumentView.All);
    expect(lastFilters().statuses).toEqual([]);
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

    expect(lastFilters().view).toBe(DocumentView.All);
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

  /**
   * Lo que el usuario ve al abrir el panel: "Todos" ya marcado y ningún estado elegido. Y "Todos"
   * no lo encierra: puede pasar a otro recorte y, volviendo a pulsarlo, regresar.
   */
  it('muestra "Todos" seleccionado al abrir el panel y deja cambiarlo', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DocumentsView />);

    await user.click(screen.getByRole('button', { name: /filtros/i }));
    const panel = await screen.findByRole('dialog');

    expect(within(panel).getByRole('button', { name: 'Todos' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      within(panel).getByRole('button', { name: 'En espera de firma' }),
    ).toHaveAttribute('aria-pressed', 'false');

    const requiresMySignature = within(panel).getByRole('button', {
      name: 'Requieren mi firma o revisión',
    });
    await user.click(requiresMySignature);
    await waitFor(() =>
      expect(lastFilters().view).toBe(DocumentView.RequiresMySignature),
    );

    await user.click(requiresMySignature);
    await waitFor(() => expect(lastFilters().view).toBe(DocumentView.All));
  });

  it('acumula varios estados a la vez', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DocumentsView />);

    await user.click(screen.getByRole('button', { name: /filtros/i }));
    const panel = await screen.findByRole('dialog');
    await user.click(within(panel).getByRole('button', { name: 'En espera de firma' }));
    await user.click(within(panel).getByRole('button', { name: 'Rechazado' }));

    await waitFor(() =>
      expect(lastFilters().statuses).toEqual([
        DocumentStatus.PendingSignature,
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
    await user.click(within(panel).getByRole('button', { name: 'En espera de firma' }));
    await user.keyboard('{Escape}');

    const chip = await screen.findByRole('button', {
      name: /quitar filtro: en espera de firma/i,
    });
    await user.click(chip);

    await waitFor(() => expect(lastFilters().statuses).toEqual([]));
  });

  /** Historia "Agregar filtro de documentos archivados". */
  describe('filtro "Archivados"', () => {
    async function openPanel(user: ReturnType<typeof userEvent.setup>) {
      await user.click(screen.getByRole('button', { name: /filtros/i }));
      return screen.findByRole('dialog');
    }

    /** Una respuesta ya resuelta, que es cuando tiene sentido hablar de "vacío". */
    function respondWith(items: unknown[]) {
      mockedUseDocuments.mockReturnValue({
        data: {
          items,
          pagination: {
            page: 1,
            limit: 25,
            total: items.length,
            totalPages: items.length ? 1 : 0,
          },
        },
        isLoading: false,
        isError: false,
        isSuccess: true,
      });
    }

    it('se ofrece en el panel y se combina con el recorte elegido', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DocumentsView />);

      const panel = await openPanel(user);
      await user.click(
        within(panel).getByRole('button', { name: 'Creados por mí' }),
      );
      await user.click(
        within(panel).getByRole('button', { name: 'Archivados' }),
      );

      await waitFor(() => expect(lastFilters().archived).toBe(true));
      expect(lastFilters().view).toBe(DocumentView.CreatedByMe);
      expect(
        within(panel).getByRole('button', { name: 'Archivados' }),
      ).toHaveAttribute('aria-pressed', 'true');
    });

    /** Elegir un filtro vuelve a la primera página, también éste. */
    it('al aplicarlo vuelve a la primera página', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DocumentsView />);

      const panel = await openPanel(user);
      await user.click(
        within(panel).getByRole('button', { name: 'Archivados' }),
      );

      await waitFor(() => expect(lastFilters().archived).toBe(true));
      const calls = mockedUseDocuments.mock.calls;
      expect(calls[calls.length - 1][0].page).toBe(1);
    });

    it('se quita desde su chip para volver a los documentos activos', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DocumentsView />);

      const panel = await openPanel(user);
      await user.click(
        within(panel).getByRole('button', { name: 'Archivados' }),
      );
      await user.keyboard('{Escape}');

      await user.click(
        await screen.findByRole('button', {
          name: /quitar filtro: archivados/i,
        }),
      );

      await waitFor(() => expect(lastFilters().archived).toBe(false));
    });

    it('sin archivados muestra un estado vacío claro y la salida a los activos', async () => {
      respondWith([]);
      const user = userEvent.setup();
      renderWithProviders(<DocumentsView />);

      const panel = await openPanel(user);
      await user.click(
        within(panel).getByRole('button', { name: 'Archivados' }),
      );
      await user.keyboard('{Escape}');

      expect(
        await screen.findByText('No tienes documentos archivados'),
      ).toBeInTheDocument();

      await user.click(
        screen.getByRole('button', { name: /ver documentos activos/i }),
      );

      await waitFor(() => expect(lastFilters().archived).toBe(false));
      expect(
        screen.queryByText('No tienes documentos archivados'),
      ).not.toBeInTheDocument();
    });

    /** Con otros criterios, "no tienes archivados" podría ser falso: se dice otra cosa. */
    it('con búsqueda u otros filtros, el vacío no afirma que no haya archivados', async () => {
      respondWith([]);
      const user = userEvent.setup();
      renderWithProviders(<DocumentsView />);

      const panel = await openPanel(user);
      await user.click(
        within(panel).getByRole('button', { name: 'Archivados' }),
      );
      await user.click(
        within(panel).getByRole('button', { name: 'Creados por mí' }),
      );
      await user.keyboard('{Escape}');

      expect(
        await screen.findByText(
          'Ningún documento archivado coincide con la búsqueda o los filtros',
        ),
      ).toBeInTheDocument();
      expect(
        screen.queryByText('No tienes documentos archivados'),
      ).not.toBeInTheDocument();
    });

    it('fuera del filtro no muestra el estado vacío de archivados', () => {
      respondWith([]);
      renderWithProviders(<DocumentsView />);

      expect(
        screen.queryByText(/documentos archivados/i),
      ).not.toBeInTheDocument();
    });

    /** Lo que se lista ahí ya está archivado: ofrecer "Archivar" otra vez no tiene sentido. */
    it('en la vista de archivados no ofrece "Archivar"', async () => {
      respondWith([
        {
          id: 'doc-archivado',
          fileName: 'contrato.pdf',
          creator: 'Ana López',
          totalPages: 1,
          status: DocumentStatus.Signed,
          createdAt: '2026-03-15T12:00:00.000Z',
          signedAt: '2026-05-10T12:00:00.000Z',
        },
      ]);
      const user = userEvent.setup();
      renderWithProviders(<DocumentsView />);

      const panel = await openPanel(user);
      await user.click(
        within(panel).getByRole('button', { name: 'Archivados' }),
      );
      await user.keyboard('{Escape}');

      await user.click(
        screen.getByRole('button', { name: /acciones del documento/i }),
      );
      const menu = await screen.findByRole('menu');

      expect(
        within(menu).getByRole('menuitem', { name: 'Descargar' }),
      ).toBeInTheDocument();
      expect(
        within(menu).queryByRole('menuitem', { name: /archivar/i }),
      ).not.toBeInTheDocument();
    });
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
            witnesses: [],
            creator: 'Sara Ramírez',
            totalPages: 1,
            status: DocumentStatus.PendingSignature,
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

  /**
   * El alta salió del sidebar: este botón es el único acceso a la creación desde la navegación,
   * así que si desaparece la pantalla queda sin manera de llegar al alta salvo tecleando la
   * URL a mano.
   */
  it('ofrece crear un documento desde la misma pantalla', () => {
    renderWithProviders(<DocumentsView />);

    expect(
      screen.getByRole('button', { name: /crear documento/i }),
    ).toHaveAttribute('href', '/dashboard/documents/create');
  });
});

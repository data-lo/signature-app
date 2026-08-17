import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor, within } from '@/test-utils';
import DocumentsTable, { type DocumentListItem } from './DocumentsTable';
import { useDownloadDocument } from '../_hooks/useDownloadDocument';
import { DocumentStatus } from '@/lib/enums/document';

jest.mock('../_hooks/useDownloadDocument');
jest.mock('../[documentId]/_hooks/useDocumentDetail', () => ({
  useDocumentDetail: () => ({
    data: undefined,
    isLoading: false,
    isError: false,
  }),
}));
jest.mock('./PdfPreview', () => ({
  __esModule: true,
  default: () => <div>PDF preview</div>,
}));
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

const mockedUseDownloadDocument = useDownloadDocument as jest.Mock;

function buildDoc(overrides: Partial<DocumentListItem> = {}): DocumentListItem {
  return {
    id: 'doc-1',
    fileName: 'contrato.pdf',
    fileType: 'application/pdf',
    signers: ['Juan Pérez'],
    spectators: [],
    creator: 'Creador Uno',
    creatorRfc: 'CRUN850315HN2',
    totalPages: 1,
    status: DocumentStatus.Signed,
    createdAt: new Date(2026, 2, 15, 23, 55).toISOString(),
    ...overrides,
  };
}

/** Abre el menú de tres puntos de la única fila renderizada y devuelve su contenido. */
async function openRowMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole('button', { name: /acciones del documento/i }),
  );
  return screen.findByRole('menu');
}

describe('DocumentsTable', () => {
  const downloadMutate = jest.fn();

  beforeEach(() => {
    downloadMutate.mockReset();
    mockedUseDownloadDocument.mockReturnValue({
      mutate: downloadMutate,
      isPending: false,
      variables: undefined,
    });
  });

  describe('estructura de tabla compartida por las tres secciones', () => {
    it('renderiza las columnas Documento / Creado por / Creado el / Estado de firma / Acciones', () => {
      renderWithProviders(<DocumentsTable documents={[buildDoc()]} />);

      const headers = screen
        .getAllByRole('columnheader')
        .map((header) => header.textContent?.trim());

      expect(headers).toEqual([
        'Documento',
        'Creado por',
        'Creado el',
        'Estado de firma',
        'Acciones',
      ]);
    });

    it('muestra el RFC del creador como texto secundario debajo de su nombre', () => {
      renderWithProviders(<DocumentsTable documents={[buildDoc()]} />);

      expect(screen.getByText('Creador Uno')).toBeInTheDocument();
      expect(screen.getByText('CRUN850315HN2')).toHaveClass(
        'text-muted-foreground',
      );
    });

    it('omite el RFC (sin dejar hueco ni texto vacío) si el creador todavía no lo registró', () => {
      renderWithProviders(
        <DocumentsTable documents={[buildDoc({ creatorRfc: null })]} />,
      );

      expect(screen.getByText('Creador Uno')).toBeInTheDocument();
      expect(screen.queryByText('CRUN850315HN2')).not.toBeInTheDocument();
    });

    it('usa el formato de fecha legible y contextual en "Creado el"', () => {
      renderWithProviders(<DocumentsTable documents={[buildDoc()]} />);

      expect(
        screen.getByText('Domingo 15 de marzo, 11:55 PM'),
      ).toBeInTheDocument();
    });
  });

  describe('menú de acciones', () => {
    it('concentra Descargar, Ver detalle y Compartir en el menú de tres puntos', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <DocumentsTable documents={[buildDoc()]} onViewDetail={jest.fn()} />,
      );

      const menu = await openRowMenu(user);

      expect(
        within(menu).getByRole('menuitem', { name: /descargar/i }),
      ).toBeInTheDocument();
      expect(
        within(menu).getByRole('menuitem', { name: /ver detalle/i }),
      ).toBeInTheDocument();
      expect(
        within(menu).getByRole('menuitem', { name: /compartir/i }),
      ).toBeInTheDocument();
    });

    it('bug corregido: "Descargar" de un documento firmado dispara la descarga en vez de no hacer nada', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <DocumentsTable
          documents={[buildDoc({ status: DocumentStatus.Signed })]}
        />,
      );

      const menu = await openRowMenu(user);
      await user.click(
        within(menu).getByRole('menuitem', { name: /descargar/i }),
      );

      expect(downloadMutate).toHaveBeenCalledWith('doc-1');
    });

    it('"Ver detalle" navega al documento', async () => {
      const user = userEvent.setup();
      const onViewDetail = jest.fn();
      renderWithProviders(
        <DocumentsTable documents={[buildDoc()]} onViewDetail={onViewDetail} />,
      );

      const menu = await openRowMenu(user);
      await user.click(
        within(menu).getByRole('menuitem', { name: /ver detalle/i }),
      );

      expect(onViewDetail).toHaveBeenCalledWith('doc-1');
    });

    it('muestra "Descargando..." y deshabilita la acción mientras la descarga de ese documento está en curso', async () => {
      mockedUseDownloadDocument.mockReturnValue({
        mutate: downloadMutate,
        isPending: true,
        variables: 'doc-1',
      });
      const user = userEvent.setup();
      renderWithProviders(<DocumentsTable documents={[buildDoc()]} />);

      const menu = await openRowMenu(user);

      expect(
        within(menu).getByRole('menuitem', { name: /descargando/i }),
      ).toHaveAttribute('data-disabled');
    });

    it('no deshabilita la descarga de un documento distinto al que está en curso', async () => {
      mockedUseDownloadDocument.mockReturnValue({
        mutate: downloadMutate,
        isPending: true,
        variables: 'otro-doc',
      });
      const user = userEvent.setup();
      renderWithProviders(
        <DocumentsTable documents={[buildDoc({ id: 'doc-1' })]} />,
      );

      const menu = await openRowMenu(user);

      expect(
        within(menu).getByRole('menuitem', { name: /^descargar/i }),
      ).not.toHaveAttribute('data-disabled');
    });

    it('para un documento pendiente conserva FIRMAR como acción primaria junto al menú', () => {
      renderWithProviders(
        <DocumentsTable
          documents={[buildDoc({ status: DocumentStatus.Pending })]}
          onSignClick={jest.fn()}
        />,
      );

      expect(
        screen.getByRole('button', { name: /^firmar$/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /acciones del documento/i }),
      ).toBeInTheDocument();
    });
  });

  describe('compartir', () => {
    it('genera el enlace a la vista pública del documento y lo copia al portapapeles', async () => {
      // `userEvent.setup()` instala su propio stub de `navigator.clipboard`, así que la copia se
      // verifica leyendo de vuelta ese portapapeles en vez de espiar `writeText`.
      const user = userEvent.setup();
      const expectedUrl = `${window.location.origin}/public/documents/doc-1`;
      renderWithProviders(<DocumentsTable documents={[buildDoc()]} />);

      const menu = await openRowMenu(user);
      await user.click(
        within(menu).getByRole('menuitem', { name: /compartir/i }),
      );

      const link = await screen.findByLabelText(
        /enlace público del documento/i,
      );
      expect(link).toHaveValue(expectedUrl);

      await user.click(screen.getByRole('button', { name: /copiar enlace/i }));

      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: /enlace copiado/i }),
        ).toBeInTheDocument(),
      );
      expect(await navigator.clipboard.readText()).toBe(expectedUrl);
    });
  });
});

import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor, within } from '@/test-utils';
import DocumentsTable, { type DocumentListItem } from './DocumentsTable';
import { useDownloadDocument } from '../_hooks/useDownloadDocument';
import { DocumentStatus, SignatureType } from '@/lib/enums/document';

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
    it('renderiza las columnas Documento / Creado por / Fecha de creación / Tipo de firma / Estado de firma / Acciones', () => {
      renderWithProviders(<DocumentsTable documents={[buildDoc()]} />);

      const headers = screen
        .getAllByRole('columnheader')
        .map((header) => header.textContent?.trim());

      expect(headers).toEqual([
        'Documento',
        'Creado por',
        'Fecha de creación',
        'Tipo de firma',
        'Estado de firma',
        'Acciones',
      ]);
    });

    it('muestra el RFC del creador rotulado y como texto secundario debajo de su nombre', () => {
      renderWithProviders(<DocumentsTable documents={[buildDoc()]} />);

      expect(screen.getByText('Creador Uno')).toBeInTheDocument();
      expect(screen.getByText(/^RFC: CRUN850315HN2$/)).toHaveClass(
        'text-muted-foreground',
      );
    });

    it('omite el RFC (sin dejar hueco ni rótulo suelto) si el creador todavía no lo registró', () => {
      renderWithProviders(
        <DocumentsTable documents={[buildDoc({ creatorRfc: null })]} />,
      );

      expect(screen.getByText('Creador Uno')).toBeInTheDocument();
      expect(screen.queryByText(/RFC:/)).not.toBeInTheDocument();
    });

    it('usa el formato de fecha legible y contextual en "Fecha de creación"', () => {
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
        within(menu)
          .getAllByRole('menuitem')
          .map((item) => item.textContent?.trim()),
      ).toEqual(['Descargar', 'Ver detalle', 'Compartir']);
    });

    /**
     * El diseño fija tres acciones también para documentos ya firmados: la previsualización en
     * diálogo que vivía aquí se retiró porque "Ver detalle" lleva al mismo visor del PDF.
     */
    it('un documento firmado no agrega una cuarta acción de previsualización', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <DocumentsTable
          documents={[buildDoc({ status: DocumentStatus.Signed })]}
          onViewDetail={jest.fn()}
        />,
      );

      const menu = await openRowMenu(user);

      expect(within(menu).getAllByRole('menuitem')).toHaveLength(3);
      expect(
        within(menu).queryByRole('menuitem', { name: /previsualizar/i }),
      ).not.toBeInTheDocument();
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

    /**
     * Historia "Reubicar acción de firma": firmar era un botón de texto propio al lado del menú,
     * el último resto del reparto anterior de acciones. Ahora vive dentro del menú como el
     * resto, y la columna sólo contiene el disparador de tres puntos.
     */
    describe('acción Firmar', () => {
      it('ya no se ofrece como botón de texto en la fila', () => {
        renderWithProviders(
          <DocumentsTable
            documents={[buildDoc({ status: DocumentStatus.Pending })]}
            onSignClick={jest.fn()}
          />,
        );

        expect(
          screen.queryByRole('button', { name: /^firmar$/i }),
        ).not.toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: /acciones del documento/i }),
        ).toBeInTheDocument();
      });

      it('se ofrece dentro del menú de acciones para un documento firmable', async () => {
        const user = userEvent.setup();
        renderWithProviders(
          <DocumentsTable
            documents={[buildDoc({ status: DocumentStatus.Pending })]}
            onSignClick={jest.fn()}
          />,
        );

        const menu = await openRowMenu(user);

        expect(
          within(menu).getByRole('menuitem', { name: /^firmar$/i }),
        ).toBeInTheDocument();
      });

      /** El flujo no cambió: sigue siendo la misma navegación al detalle del documento. */
      it('al elegirla dispara onSignClick con el id del documento', async () => {
        const onSignClick = jest.fn();
        const user = userEvent.setup();
        renderWithProviders(
          <DocumentsTable
            documents={[
              buildDoc({ id: 'doc-9', status: DocumentStatus.Pending }),
            ]}
            onSignClick={onSignClick}
          />,
        );

        const menu = await openRowMenu(user);
        await user.click(
          within(menu).getByRole('menuitem', { name: /^firmar$/i }),
        );

        expect(onSignClick).toHaveBeenCalledWith('doc-9');
      });

      /** Secciones sin firma (Enviados, Completados) no reciben `onSignClick`. */
      it('no aparece si la sección no ofrece firmar', async () => {
        const user = userEvent.setup();
        renderWithProviders(
          <DocumentsTable
            documents={[buildDoc({ status: DocumentStatus.Pending })]}
          />,
        );

        const menu = await openRowMenu(user);

        expect(
          within(menu).queryByRole('menuitem', { name: /^firmar$/i }),
        ).not.toBeInTheDocument();
      });

      it.each([
        DocumentStatus.Signed,
        DocumentStatus.Rejected,
        DocumentStatus.Cancelled,
        DocumentStatus.Expired,
        DocumentStatus.Created,
        DocumentStatus.CancellationPending,
      ])('no aparece para un documento en %s', async (status) => {
        const user = userEvent.setup();
        renderWithProviders(
          <DocumentsTable
            documents={[buildDoc({ status })]}
            onSignClick={jest.fn()}
          />,
        );

        const menu = await openRowMenu(user);

        expect(
          within(menu).queryByRole('menuitem', { name: /^firmar$/i }),
        ).not.toBeInTheDocument();
      });

      /** Las demás acciones del menú siguen intactas y en su orden. */
      it('no desplaza ni altera las demás acciones del menú', async () => {
        const user = userEvent.setup();
        renderWithProviders(
          <DocumentsTable
            documents={[buildDoc({ status: DocumentStatus.Pending })]}
            onSignClick={jest.fn()}
            onViewDetail={jest.fn()}
          />,
        );

        const menu = await openRowMenu(user);

        expect(
          within(menu)
            .getAllByRole('menuitem')
            .map((item) => item.textContent?.trim()),
        ).toEqual(['Firmar', 'Descargar', 'Ver detalle', 'Compartir']);
      });
    });
  });

  /**
   * Historia "Mostrar tipo de firma en las tablas de documentos". El valor lo resuelve el backend
   * a partir de los firmantes del documento; acá solo se traduce a la etiqueta de la columna.
   */
  describe('columna Tipo de firma', () => {
    /** Celda de "Tipo de firma" de la única fila renderizada, por su posición en el encabezado. */
    function signatureTypeCell(): HTMLElement {
      const headers = screen.getAllByRole('columnheader');
      const columnIndex = headers.findIndex(
        (header) => header.textContent?.trim() === 'Tipo de firma',
      );
      expect(columnIndex).toBeGreaterThan(-1);

      const [row] = screen.getAllByRole('row').slice(1);
      return within(row).getAllByRole('cell')[columnIndex];
    }

    it('muestra "Simple" para un documento de firma simple', () => {
      renderWithProviders(
        <DocumentsTable
          documents={[buildDoc({ signatureType: SignatureType.Simple })]}
        />,
      );

      expect(signatureTypeCell()).toHaveTextContent('Simple');
    });

    it('muestra "E.Firma" para un documento de firma avanzada', () => {
      renderWithProviders(
        <DocumentsTable
          documents={[buildDoc({ signatureType: SignatureType.Fiel })]}
        />,
      );

      expect(signatureTypeCell()).toHaveTextContent('E.Firma');
    });

    // Documentos creados antes de que se registrara el tipo de firma: la fila se sigue viendo
    // completa, con un guion en vez de un tipo inventado.
    it('muestra un guion cuando el documento no tiene tipo de firma registrado', () => {
      renderWithProviders(
        <DocumentsTable documents={[buildDoc({ signatureType: null })]} />,
      );

      expect(signatureTypeCell()).toHaveTextContent('—');
    });

    // Criterio "la nueva columna no afecta la visualización, filtros ni acciones existentes".
    it('no altera el resto de las columnas de la fila', () => {
      renderWithProviders(
        <DocumentsTable
          documents={[buildDoc({ signatureType: SignatureType.Fiel })]}
        />,
      );

      const [row] = screen.getAllByRole('row').slice(1);
      expect(within(row).getByText('contrato.pdf')).toBeInTheDocument();
      expect(within(row).getByText('Creador Uno')).toBeInTheDocument();
      expect(within(row).getByText('Firmado por todos')).toBeInTheDocument();
      expect(
        within(row).getByRole('button', { name: /acciones del documento/i }),
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

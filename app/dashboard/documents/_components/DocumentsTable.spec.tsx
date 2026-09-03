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
    signedAt: new Date(2026, 4, 10, 9, 30).toISOString(),
    ...overrides,
  };
}

/**
 * Celda de la única fila renderizada que corresponde a la columna `header`, ubicada por la
 * posición de ese encabezado: así las aserciones siguen valiendo si el orden vuelve a cambiar.
 */
function dataCell(header: string): HTMLElement {
  const headers = screen.getAllByRole('columnheader');
  const columnIndex = headers.findIndex(
    (columnHeader) => columnHeader.textContent?.trim() === header,
  );
  expect(columnIndex).toBeGreaterThan(-1);

  const [row] = screen.getAllByRole('row').slice(1);
  return within(row).getAllByRole('cell')[columnIndex];
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
    it('renderiza las columnas en el orden Documento / Creado por / Estatus / Fecha de creación / Fecha de firma / Tipo de firma / Acciones', () => {
      renderWithProviders(<DocumentsTable documents={[buildDoc()]} />);

      const headers = screen
        .getAllByRole('columnheader')
        .map((header) => header.textContent?.trim());

      expect(headers).toEqual([
        'Documento',
        'Creado por',
        'Estatus',
        'Fecha de creación',
        'Fecha de firma',
        'Tipo de firma',
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

    it('muestra el nombre de quien creó el documento en "Creado por"', () => {
      renderWithProviders(<DocumentsTable documents={[buildDoc()]} />);

      expect(dataCell('Creado por')).toHaveTextContent('Creador Uno');
    });
  });

  /**
   * Historia "Reordenar y ajustar datos en las tablas de documentos": las dos fechas se muestran
   * en DD/MM/YYYY, que es lo que se compara de un vistazo en un listado. El formato largo
   * ("Domingo 15 de marzo, 11:55 PM") sigue en las pantallas de detalle y evidencia.
   */
  describe('fechas', () => {
    it('muestra la fecha de creación en formato DD/MM/YYYY', () => {
      renderWithProviders(<DocumentsTable documents={[buildDoc()]} />);

      expect(dataCell('Fecha de creación')).toHaveTextContent('15/03/2026');
    });

    it('muestra la fecha de firma en formato DD/MM/YYYY', () => {
      renderWithProviders(<DocumentsTable documents={[buildDoc()]} />);

      expect(dataCell('Fecha de firma')).toHaveTextContent('10/05/2026');
    });

    it('rellena con ceros los días y meses de un solo dígito', () => {
      renderWithProviders(
        <DocumentsTable
          documents={[
            buildDoc({ createdAt: new Date(2026, 0, 2, 8, 5).toISOString() }),
          ]}
        />,
      );

      expect(dataCell('Fecha de creación')).toHaveTextContent('02/01/2026');
    });

    it('muestra "No disponible" en "Fecha de firma" mientras el documento no está firmado', () => {
      renderWithProviders(
        <DocumentsTable
          documents={[
            buildDoc({ status: DocumentStatus.Pending, signedAt: null }),
          ]}
        />,
      );

      expect(dataCell('Fecha de firma')).toHaveTextContent('No disponible');
    });

    /** Documentos del endpoint antiguo: la fila se ve completa igual, sin fecha inventada. */
    it('también muestra "No disponible" si el backend no informa la fecha de firma', () => {
      renderWithProviders(
        <DocumentsTable documents={[buildDoc({ signedAt: undefined })]} />,
      );

      expect(dataCell('Fecha de firma')).toHaveTextContent('No disponible');
    });
  });

  describe('menú de acciones', () => {
    it('deja en el menú de tres puntos sólo Descargar y Compartir', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <DocumentsTable documents={[buildDoc()]} onRowSelect={jest.fn()} />,
      );

      const menu = await openRowMenu(user);

      expect(
        within(menu)
          .getAllByRole('menuitem')
          .map((item) => item.textContent?.trim()),
      ).toEqual(['Descargar', 'Compartir']);
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
     * Historia "Hacer seleccionables las filas": firmar y ver detalle salieron del menú porque
     * las dos abrían `/dashboard/documents/:id`, que es lo que ahora hace la fila.
     */
    it.each([/^firmar$/i, /ver detalle/i])(
      'ya no ofrece %s en el menú',
      async (name) => {
        const user = userEvent.setup();
        renderWithProviders(
          <DocumentsTable
            documents={[buildDoc({ status: DocumentStatus.Pending })]}
            onRowSelect={jest.fn()}
          />,
        );

        const menu = await openRowMenu(user);

        expect(
          within(menu).queryByRole('menuitem', { name }),
        ).not.toBeInTheDocument();
      },
    );

    it('tampoco ofrece firmar como botón de texto en la fila', () => {
      renderWithProviders(
        <DocumentsTable
          documents={[buildDoc({ status: DocumentStatus.Pending })]}
          onRowSelect={jest.fn()}
        />,
      );

      expect(
        screen.queryByRole('button', { name: /^firmar$/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /acciones del documento/i }),
      ).toBeInTheDocument();
    });
  });

  /**
   * Historia "Hacer seleccionables las filas en tablas de documentos": la fila entera es el
   * camino al detalle, y las acciones que quedan no deben dispararlo.
   */
  describe('fila seleccionable', () => {
    /** La única fila de datos renderizada (la primera de `getAllByRole('row')` es el encabezado). */
    function dataRow(): HTMLElement {
      return screen.getAllByRole('row')[1];
    }

    it('navega al detalle al hacer clic en cualquier punto de la fila', async () => {
      const user = userEvent.setup();
      const onRowSelect = jest.fn();
      renderWithProviders(
        <DocumentsTable
          documents={[buildDoc({ id: 'doc-9' })]}
          onRowSelect={onRowSelect}
        />,
      );

      await user.click(within(dataRow()).getByText('Creador Uno'));

      expect(onRowSelect).toHaveBeenCalledWith('doc-9');
    });

    /**
     * Las columnas que se reordenaron y las fechas que cambiaron de formato viven dentro de la
     * fila, no al lado: activarlas navega igual que cualquier otro punto de ella.
     */
    it.each(['Estatus', 'Fecha de creación', 'Fecha de firma'])(
      'navega también al hacer clic en la columna %s',
      async (header) => {
        const user = userEvent.setup();
        const onRowSelect = jest.fn();
        renderWithProviders(
          <DocumentsTable
            documents={[buildDoc({ id: 'doc-9' })]}
            onRowSelect={onRowSelect}
          />,
        );

        await user.click(dataCell(header));

        expect(onRowSelect).toHaveBeenCalledWith('doc-9');
      },
    );

    it('indica que la fila es seleccionable con el cursor de mano', () => {
      renderWithProviders(
        <DocumentsTable documents={[buildDoc()]} onRowSelect={jest.fn()} />,
      );

      expect(dataRow()).toHaveClass('cursor-pointer');
    });

    /** El nombre del documento es un botón real para que la fila se alcance con Tab. */
    it('permite abrir el documento con el teclado', async () => {
      const user = userEvent.setup();
      const onRowSelect = jest.fn();
      renderWithProviders(
        <DocumentsTable
          documents={[buildDoc({ id: 'doc-9' })]}
          onRowSelect={onRowSelect}
        />,
      );

      await user.tab();
      expect(
        screen.getByRole('button', { name: 'contrato.pdf' }),
      ).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(onRowSelect).toHaveBeenCalledWith('doc-9');
    });

    it('no hace la fila seleccionable si la vista no ofrece la navegación', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DocumentsTable documents={[buildDoc()]} />);

      expect(dataRow()).not.toHaveClass('cursor-pointer');
      expect(
        screen.queryByRole('button', { name: 'contrato.pdf' }),
      ).not.toBeInTheDocument();

      // Sin `onRowSelect` la fila es texto: el clic no rompe nada ni navega a ningún lado.
      await user.click(within(dataRow()).getByText('contrato.pdf'));
    });

    it('descargar desde el menú no dispara la navegación de la fila', async () => {
      const user = userEvent.setup();
      const onRowSelect = jest.fn();
      renderWithProviders(
        <DocumentsTable documents={[buildDoc()]} onRowSelect={onRowSelect} />,
      );

      const menu = await openRowMenu(user);
      await user.click(
        within(menu).getByRole('menuitem', { name: /descargar/i }),
      );

      expect(downloadMutate).toHaveBeenCalledWith('doc-1');
      expect(onRowSelect).not.toHaveBeenCalled();
    });

    it('compartir desde el menú no dispara la navegación de la fila', async () => {
      const user = userEvent.setup();
      const onRowSelect = jest.fn();
      renderWithProviders(
        <DocumentsTable documents={[buildDoc()]} onRowSelect={onRowSelect} />,
      );

      const menu = await openRowMenu(user);
      await user.click(
        within(menu).getByRole('menuitem', { name: /compartir/i }),
      );

      expect(
        await screen.findByLabelText(/enlace público del documento/i),
      ).toBeInTheDocument();
      expect(onRowSelect).not.toHaveBeenCalled();
    });
  });

  /**
   * Historia "Mostrar tipo de firma en las tablas de documentos". El valor lo resuelve el backend
   * a partir de los firmantes del documento; acá solo se traduce a la etiqueta de la columna.
   */
  describe('columna Tipo de firma', () => {
    it('muestra "Simple" para un documento de firma simple', () => {
      renderWithProviders(
        <DocumentsTable
          documents={[buildDoc({ signatureType: SignatureType.Simple })]}
        />,
      );

      expect(dataCell('Tipo de firma')).toHaveTextContent('Simple');
    });

    it('muestra "E.Firma" para un documento de firma avanzada', () => {
      renderWithProviders(
        <DocumentsTable
          documents={[buildDoc({ signatureType: SignatureType.Fiel })]}
        />,
      );

      expect(dataCell('Tipo de firma')).toHaveTextContent('E.Firma');
    });

    // Documentos creados antes de que se registrara el tipo de firma: la fila se sigue viendo
    // completa, con un guion en vez de un tipo inventado.
    it('muestra un guion cuando el documento no tiene tipo de firma registrado', () => {
      renderWithProviders(
        <DocumentsTable documents={[buildDoc({ signatureType: null })]} />,
      );

      expect(dataCell('Tipo de firma')).toHaveTextContent('—');
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

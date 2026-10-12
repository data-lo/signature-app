import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, within } from '@/test-utils';
import DocumentsTable, {
  documentRowIndex,
  EMPTY_DOCUMENTS_MESSAGE,
  type DocumentListItem,
} from './DocumentsTable';
import { DocumentStatus, SignatureType } from '@/lib/enums/document';

function buildDoc(overrides: Partial<DocumentListItem> = {}): DocumentListItem {
  return {
    id: 'doc-1',
    fileName: 'contrato.pdf',
    fileType: 'application/pdf',
    signers: ['Juan Pérez'],
    witnesses: [],
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

describe('DocumentsTable', () => {
  describe('estructura de la tabla', () => {
    it('renderiza las columnas en el orden Índice / Documento / Creado por / Participación / Estatus / Fecha de creación / Fecha de firma / Tipo de firma / Acciones', () => {
      renderWithProviders(<DocumentsTable documents={[buildDoc()]} />);

      const headers = screen
        .getAllByRole('columnheader')
        .map((header) => header.textContent?.trim());

      expect(headers).toEqual([
        'Índice',
        'Documento',
        'Creado por',
        'Participación',
        'Estatus',
        'Fecha de creación',
        'Fecha de firma',
        'Tipo de firma',
        'Acciones',
      ]);
    });

    /**
     * Historia "Ajustar columnas de la tabla de documentos": la columna Documento sólo lleva la
     * información del archivo. El estatus se sigue viendo, en su propia columna.
     */
    it('la columna Documento ya no muestra el punto de color del estatus', () => {
      renderWithProviders(
        <DocumentsTable
          documents={[buildDoc({ status: DocumentStatus.Rejected })]}
        />,
      );

      const documentCell = dataCell('Documento');
      expect(
        documentCell.querySelector('[data-slot="status-dot"]'),
      ).not.toBeInTheDocument();
      expect(documentCell).toHaveTextContent('contrato.pdf');
      expect(dataCell('Estatus')).toHaveTextContent('Rechazado');
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
            buildDoc({
              status: DocumentStatus.PendingSignature,
              signedAt: null,
            }),
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

    /**
     * Historia "Mostrar fecha y hora completa con Tooltip": la fecha compacta se queda en la celda
     * y el detalle con hora de 24 horas aparece en el Tooltip de shadcn al pasar el cursor.
     */
    /**
     * Historia "Truncar el nombre del documento y mostrarlo completo en un tooltip": el nombre
     * ocupa una sola línea dentro de una columna de ancho fijo y el completo va en el Tooltip.
     * El detalle de cuándo abre (sólo si está recortado, también con el foco) lo cubre
     * `DocumentFileName.spec.tsx`.
     */
    describe('nombre del documento recortado', () => {
      const LONG_NAME =
        'Contrato de prestación de servicios profesionales 2026.pdf';

      afterEach(() => jest.restoreAllMocks());

      it('la columna tiene un ancho fijo y el nombre no se parte en varias líneas', () => {
        renderWithProviders(
          <DocumentsTable
            documents={[buildDoc({ fileName: LONG_NAME })]}
            onRowSelect={jest.fn()}
          />,
        );

        const cell = dataCell('Documento');
        expect(cell).toHaveClass('w-64', 'max-w-64');
        expect(cell).not.toHaveClass('whitespace-normal');

        const name = within(cell).getByRole('button', { name: LONG_NAME });
        expect(name).toHaveClass('truncate');
        expect(name).not.toHaveClass('break-words');
      });

      it('un nombre recortado muestra el nombre completo en el tooltip al pasar el cursor', async () => {
        jest
          .spyOn(HTMLElement.prototype, 'scrollWidth', 'get')
          .mockReturnValue(480);
        jest
          .spyOn(HTMLElement.prototype, 'clientWidth', 'get')
          .mockReturnValue(256);
        const user = userEvent.setup();
        renderWithProviders(
          <DocumentsTable
            documents={[buildDoc({ fileName: LONG_NAME })]}
            onRowSelect={jest.fn()}
          />,
        );

        await user.hover(
          within(dataCell('Documento')).getByRole('button', {
            name: LONG_NAME,
          }),
        );

        expect(
          await screen.findByText(LONG_NAME, {
            selector: '[data-slot="tooltip-content"]',
          }),
        ).toBeVisible();
      });
    });

    describe('tooltip con la fecha completa', () => {
      it('la fecha de creación muestra su fecha y hora completas al pasar el cursor', async () => {
        const user = userEvent.setup();
        renderWithProviders(<DocumentsTable documents={[buildDoc()]} />);

        const trigger = within(dataCell('Fecha de creación')).getByRole(
          'button',
        );
        expect(trigger).toHaveTextContent('15/03/2026');

        await user.hover(trigger);

        const tooltip = await screen.findByText('DOMINGO 15 DE MARZO 23:55', {
          selector: '[data-slot="tooltip-content"]',
        });
        expect(tooltip).toBeVisible();
      });

      it('la fecha de firma muestra su fecha y hora completas al pasar el cursor', async () => {
        const user = userEvent.setup();
        renderWithProviders(<DocumentsTable documents={[buildDoc()]} />);

        await user.hover(
          within(dataCell('Fecha de firma')).getByRole('button'),
        );

        expect(
          await screen.findByText('DOMINGO 10 DE MAYO 09:30', {
            selector: '[data-slot="tooltip-content"]',
          }),
        ).toBeVisible();
      });

      /** Sin hover (teclado, lector de pantalla) el detalle sigue formando parte del nombre. */
      it('el disparador incluye la fecha completa en su nombre accesible', () => {
        renderWithProviders(<DocumentsTable documents={[buildDoc()]} />);

        expect(
          within(dataCell('Fecha de creación')).getByRole('button', {
            name: /^15\/03\/2026\s*, DOMINGO 15 DE MARZO 23:55$/,
          }),
        ).toBeInTheDocument();
      });

      it.each([
        [
          'sin firmar',
          { status: DocumentStatus.PendingSignature, signedAt: null },
        ],
        ['sin fecha informada', { signedAt: undefined }],
        ['con fecha ilegible', { signedAt: 'no-es-fecha' }],
      ])(
        'un documento %s no tiene tooltip en "Fecha de firma"',
        async (_label, overrides) => {
          const user = userEvent.setup();
          renderWithProviders(
            <DocumentsTable documents={[buildDoc(overrides)]} />,
          );

          const cell = dataCell('Fecha de firma');
          expect(cell).toHaveTextContent('No disponible');
          expect(within(cell).queryByRole('button')).not.toBeInTheDocument();

          await user.hover(within(cell).getByText('No disponible'));

          expect(
            document.querySelector('[data-slot="tooltip-content"]'),
          ).toBeNull();
        },
      );

      it('hacer clic en la fecha sigue abriendo el detalle del documento', async () => {
        const user = userEvent.setup();
        const onRowSelect = jest.fn();
        renderWithProviders(
          <DocumentsTable documents={[buildDoc()]} onRowSelect={onRowSelect} />,
        );

        await user.click(
          within(dataCell('Fecha de creación')).getByRole('button'),
        );

        expect(onRowSelect).toHaveBeenCalledWith('doc-1');
      });
    });
  });

  /**
   * Historia "Actualizar tabla de documentos a fondo blanco": la tabla y su paginación viven en
   * una tarjeta `bg-card` (blanca en tema claro), y los estados sin documentos se dibujan dentro
   * de ella en vez de dejar un cuerpo vacío.
   */
  describe('tarjeta blanca y estados', () => {
    function card(): HTMLElement {
      const element = document.querySelector<HTMLElement>(
        '[data-slot="documents-table-card"]',
      );
      expect(element).not.toBeNull();
      return element!;
    }

    it('la tabla y la paginación van dentro de una tarjeta con fondo de tarjeta', () => {
      renderWithProviders(<DocumentsTable documents={[buildDoc()]} />);

      expect(card()).toHaveClass('bg-card', 'border', 'rounded-xl');
      expect(card()).toContainElement(screen.getByRole('table'));
      expect(card()).toContainElement(
        document.querySelector<HTMLElement>(
          '[data-slot="documents-table-pagination"]',
        ),
      );
    });

    it('con información, muestra una fila por documento y resalta la fila en hover', () => {
      renderWithProviders(
        <DocumentsTable
          documents={[buildDoc(), buildDoc({ id: 'doc-2', fileName: 'b.pdf' })]}
        />,
      );

      const rows = screen.getAllByRole('row').slice(1);
      expect(rows).toHaveLength(2);
      expect(rows[0]).toHaveClass('hover:bg-muted');
      expect(screen.getByRole('table')).not.toHaveAttribute('aria-busy');
    });

    it('sin documentos, muestra el estado vacío en una fila de ancho completo', () => {
      renderWithProviders(<DocumentsTable documents={[]} />);

      const cell = screen.getByRole('cell', {
        name: 'No hay documentos para mostrar.',
      });
      // Las nueve columnas, contando "Índice".
      expect(cell).toHaveAttribute('colspan', '9');
    });

    it('cargando, muestra el esqueleto, marca la tabla como ocupada y lo anuncia', () => {
      renderWithProviders(<DocumentsTable documents={[]} isLoading />);

      expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');
      expect(screen.getByRole('status')).toHaveTextContent(
        'Cargando documentos',
      );
      expect(
        document.querySelectorAll('[data-slot="documents-loading-row"]'),
      ).toHaveLength(5);
      expect(
        screen.queryByText('No hay documentos para mostrar.'),
      ).not.toBeInTheDocument();
    });

    it('con error, muestra el mensaje en lugar de la lista, aunque haya datos o esté cargando', () => {
      renderWithProviders(
        <DocumentsTable
          documents={[buildDoc()]}
          isLoading
          errorMessage="No se pudieron cargar los documentos."
        />,
      );

      expect(screen.getByRole('alert')).toHaveTextContent(
        'No se pudieron cargar los documentos.',
      );
      expect(screen.queryByText('contrato.pdf')).not.toBeInTheDocument();
      expect(
        document.querySelector('[data-slot="documents-loading-row"]'),
      ).toBeNull();
    });

    it('la paginación sigue visible y funcional en todos los estados', async () => {
      const user = userEvent.setup();
      const onPageChange = jest.fn();
      renderWithProviders(
        <DocumentsTable
          documents={[]}
          page={1}
          totalPages={3}
          onPageChange={onPageChange}
          isLoading
        />,
      );

      const pagination = document.querySelector<HTMLElement>(
        '[data-slot="documents-table-pagination"]',
      )!;
      expect(pagination).toHaveTextContent('Documentos por página');

      const buttons = within(pagination).getAllByRole('button');
      await user.click(buttons[buttons.length - 2]);

      expect(onPageChange).toHaveBeenCalledWith(2);
    });
  });

  /**
   * Los controles se calculan con la página y el `totalPages` que recibe la tabla. El backend
   * numera desde 1 y responde `totalPages: 0` cuando no hay documentos.
   */
  describe('controles de paginación', () => {
    function renderPagination({
      page,
      totalPages,
    }: {
      page: number;
      totalPages: number;
    }) {
      const onPageChange = jest.fn();
      renderWithProviders(
        <DocumentsTable
          documents={[buildDoc()]}
          page={page}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />,
      );
      return onPageChange;
    }

    function control(name: string) {
      return screen.getByRole('button', { name });
    }

    function indicator() {
      return document.querySelector(
        '[data-slot="documents-table-page-indicator"]',
      );
    }

    it('en la primera página deshabilita "Primera" y "Anterior"', () => {
      renderPagination({ page: 1, totalPages: 3 });

      expect(control('Primera página')).toBeDisabled();
      expect(control('Página anterior')).toBeDisabled();
      expect(control('Página siguiente')).toBeEnabled();
      expect(control('Última página')).toBeEnabled();
      expect(indicator()).toHaveTextContent('1 de 3');
    });

    it('en una página intermedia habilita todo y pide la vecina correcta', async () => {
      const user = userEvent.setup();
      const onPageChange = renderPagination({ page: 2, totalPages: 3 });

      for (const name of [
        'Primera página',
        'Página anterior',
        'Página siguiente',
        'Última página',
      ]) {
        expect(control(name)).toBeEnabled();
      }

      await user.click(control('Página anterior'));
      await user.click(control('Página siguiente'));
      await user.click(control('Primera página'));
      await user.click(control('Última página'));

      expect(onPageChange.mock.calls).toEqual([[1], [3], [1], [3]]);
    });

    it('en la última página deshabilita "Siguiente" y "Última"', () => {
      renderPagination({ page: 3, totalPages: 3 });

      expect(control('Página siguiente')).toBeDisabled();
      expect(control('Última página')).toBeDisabled();
      expect(control('Página anterior')).toBeEnabled();
      expect(indicator()).toHaveTextContent('3 de 3');
    });

    it('con una sola página deshabilita toda la navegación', () => {
      renderPagination({ page: 1, totalPages: 1 });

      for (const name of [
        'Primera página',
        'Página anterior',
        'Página siguiente',
        'Última página',
      ]) {
        expect(control(name)).toBeDisabled();
      }
      expect(indicator()).toHaveTextContent('1 de 1');
    });

    /** `totalPages: 0` no significa "página 0": la tabla está en la 1 de 1, vacía. */
    it('con total cero se queda en "1 de 1" y sin navegación', () => {
      const onPageChange = jest.fn();
      renderWithProviders(
        <DocumentsTable
          documents={[]}
          page={1}
          totalPages={0}
          onPageChange={onPageChange}
        />,
      );

      expect(screen.getByText(EMPTY_DOCUMENTS_MESSAGE)).toBeInTheDocument();
      expect(control('Última página')).toBeDisabled();
      expect(control('Página siguiente')).toBeDisabled();
      expect(indicator()).toHaveTextContent('1 de 1');
    });

    it('elegir otro tamaño de página lo notifica', async () => {
      const user = userEvent.setup();
      const onPageSizeChange = jest.fn();
      renderWithProviders(
        <DocumentsTable
          documents={[buildDoc()]}
          page={1}
          totalPages={2}
          onPageChange={jest.fn()}
          pageSize={25}
          onPageSizeChange={onPageSizeChange}
        />,
      );

      screen.getByRole('combobox', { name: 'Documentos por página' }).focus();
      await user.keyboard('{Enter}');
      await user.click(await screen.findByRole('option', { name: '50' }));

      expect(onPageSizeChange).toHaveBeenCalledWith(50);
    });
  });

  describe('estado vacío', () => {
    it('pinta el estado vacío cuando la lista no trae documentos', () => {
      renderWithProviders(
        <DocumentsTable documents={[]} emptyState={<p>Nada por aquí</p>} />,
      );

      expect(screen.getByText('Nada por aquí')).toBeInTheDocument();
    });

    it('no lo pinta si hay documentos', () => {
      renderWithProviders(
        <DocumentsTable
          documents={[buildDoc()]}
          emptyState={<p>Nada por aquí</p>}
        />,
      );

      expect(screen.queryByText('Nada por aquí')).not.toBeInTheDocument();
    });
  });

  /**
   * Historia "Hacer seleccionables las filas en tablas de documentos": la fila entera es el
   * camino al detalle del documento.
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
      expect(within(row).getAllByRole('cell')).toHaveLength(9);
    });
  });

  describe('índice', () => {
    function indexCells(): string[] {
      const headers = screen.getAllByRole('columnheader');
      const column = headers.findIndex(
        (header) => header.textContent?.trim() === 'Índice',
      );
      return screen
        .getAllByRole('row')
        .slice(1)
        .map((row) => within(row).getAllByRole('cell')[column].textContent!);
    }

    it('cada fila muestra su consecutivo desde 1 en la primera página', () => {
      renderWithProviders(
        <DocumentsTable
          documents={[
            buildDoc({ id: 'doc-1' }),
            buildDoc({ id: 'doc-2' }),
            buildDoc({ id: 'doc-3' }),
          ]}
        />,
      );

      expect(indexCells()).toEqual(['1', '2', '3']);
    });

    it('el consecutivo continúa entre páginas', () => {
      renderWithProviders(
        <DocumentsTable
          documents={[buildDoc({ id: 'doc-11' }), buildDoc({ id: 'doc-12' })]}
          page={2}
          totalPages={3}
          pageSize={10}
        />,
      );

      expect(indexCells()).toEqual(['11', '12']);
    });

    it('documentRowIndex no baja de 1 aunque llegue una página inválida', () => {
      expect(documentRowIndex(0, 10, 0)).toBe(1);
      expect(documentRowIndex(3, 25, 4)).toBe(55);
    });
  });

  /**
   * Historia "Eliminar acciones de la tabla de documentos": la columna Acciones se conserva,
   * pero sus celdas quedan vacías: ni el ojo de "Ver documento" ni el menú de tres puntos.
   */
  describe('columna Acciones', () => {
    it('sigue siendo la última columna de la tabla', () => {
      renderWithProviders(<DocumentsTable documents={[buildDoc()]} />);

      const headers = screen.getAllByRole('columnheader');
      expect(headers.at(-1)).toHaveTextContent('Acciones');
    });

    it('deja vacía la celda de cada fila', () => {
      renderWithProviders(
        <DocumentsTable
          documents={[buildDoc({ id: 'doc-1' }), buildDoc({ id: 'doc-2' })]}
          onRowSelect={jest.fn()}
        />,
      );

      const actionCells = screen
        .getAllByRole('row')
        .slice(1)
        .map((row) => within(row).getAllByRole('cell').at(-1)!);
      expect(actionCells).toHaveLength(2);
      for (const cell of actionCells) {
        expect(cell).toBeEmptyDOMElement();
      }
    });

    it('no ofrece "Ver documento" ni el menú de acciones en ninguna fila', () => {
      renderWithProviders(
        <DocumentsTable
          documents={[buildDoc({ id: 'doc-1' }), buildDoc({ id: 'doc-2' })]}
          onRowSelect={jest.fn()}
        />,
      );

      expect(
        screen.queryByRole('button', { name: /ver documento/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /acciones del documento/i }),
      ).not.toBeInTheDocument();
    });
  });
});

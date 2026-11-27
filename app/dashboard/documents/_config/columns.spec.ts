import {
  DEFAULT_VISIBLE_DOCUMENT_COLUMNS,
  DOCUMENT_COLUMNS,
  documentColumnsStorageKey,
  documentTableLayout,
  isDefaultDocumentColumns,
  normalizeVisibleDocumentColumns,
  parseStoredDocumentColumns,
  setDocumentColumnVisibility,
} from './columns';

describe('columnas de la tabla de documentos', () => {
  it('lista las columnas de la tabla, en su orden, sin la de acciones', () => {
    expect(DOCUMENT_COLUMNS.map((column) => column.label)).toEqual([
      'Índice',
      'Documento',
      'Creado por',
      'Participación',
      'Estatus',
      'Fecha de creación',
      'Fecha de firma',
      'Tipo de firma',
    ]);
  });

  it('abre con todas las columnas visibles', () => {
    expect(DEFAULT_VISIBLE_DOCUMENT_COLUMNS).toEqual(
      DOCUMENT_COLUMNS.map((column) => column.id),
    );
    expect(isDefaultDocumentColumns(DEFAULT_VISIBLE_DOCUMENT_COLUMNS)).toBe(
      true,
    );
  });

  it('guarda la preferencia bajo una clave por usuario', () => {
    expect(documentColumnsStorageKey('user-1')).not.toBe(
      documentColumnsStorageKey('user-2'),
    );
  });

  describe('normalizeVisibleDocumentColumns', () => {
    it('ordena como la tabla, descarta lo desconocido y repone "Documento"', () => {
      expect(
        normalizeVisibleDocumentColumns([
          'status',
          'index',
          'inventada',
          'status',
        ]),
      ).toEqual(['index', 'document', 'status']);
    });
  });

  describe('documentTableLayout', () => {
    it('con todas las columnas conserva el mínimo de 1200px', () => {
      const layout = documentTableLayout(DEFAULT_VISIBLE_DOCUMENT_COLUMNS);

      expect(layout.minWidth).toBe(1200);
      expect(layout.columns.map((column) => column.id)).toEqual([
        ...DEFAULT_VISIBLE_DOCUMENT_COLUMNS,
        'actions',
      ]);
    });

    it('con pocas columnas sólo reserva Documento y Acciones', () => {
      expect(documentTableLayout(['document'])).toEqual({
        columns: [
          { id: 'document', width: null },
          { id: 'actions', width: 60 },
        ],
        minWidth: 288,
      });
    });

    it('con columnas intermedias suma sólo las visibles, en el orden de la tabla', () => {
      expect(documentTableLayout(['signedAt', 'document', 'index'])).toEqual({
        columns: [
          { id: 'index', width: 48 },
          { id: 'document', width: null },
          { id: 'signedAt', width: 144 },
          { id: 'actions', width: 60 },
        ],
        minWidth: 480,
      });
    });

    it('Documento es la única columna flexible', () => {
      const flexible = documentTableLayout(
        DEFAULT_VISIBLE_DOCUMENT_COLUMNS,
      ).columns.filter((column) => column.width === null);

      expect(flexible).toEqual([{ id: 'document', width: null }]);
    });

    it('al volver a mostrar una columna recupera su posición y su ancho', () => {
      const hidden = setDocumentColumnVisibility(
        DEFAULT_VISIBLE_DOCUMENT_COLUMNS,
        'status',
        false,
      );
      const restored = setDocumentColumnVisibility(hidden, 'status', true);

      expect(documentTableLayout(hidden).minWidth).toBe(1020);
      expect(documentTableLayout(restored)).toEqual(
        documentTableLayout(DEFAULT_VISIBLE_DOCUMENT_COLUMNS),
      );
    });
  });

  describe('setDocumentColumnVisibility', () => {
    it('oculta una columna y conserva el orden del resto', () => {
      expect(
        setDocumentColumnVisibility(
          DEFAULT_VISIBLE_DOCUMENT_COLUMNS,
          'creator',
          false,
        ),
      ).toEqual([
        'index',
        'document',
        'participation',
        'status',
        'createdAt',
        'signedAt',
        'signatureType',
      ]);
    });

    it('al volver a mostrarla la regresa a su posición original', () => {
      expect(
        setDocumentColumnVisibility(['document', 'signedAt'], 'status', true),
      ).toEqual(['document', 'status', 'signedAt']);
    });

    it('no deja ocultar "Documento"', () => {
      expect(
        setDocumentColumnVisibility(['document'], 'document', false),
      ).toEqual(['document']);
    });
  });

  describe('parseStoredDocumentColumns', () => {
    it('restaura una preferencia guardada', () => {
      expect(parseStoredDocumentColumns('["status","document"]')).toEqual([
        'document',
        'status',
      ]);
    });

    it('sin preferencia o con una ilegible devuelve null', () => {
      expect(parseStoredDocumentColumns(null)).toBeNull();
      expect(parseStoredDocumentColumns('{roto')).toBeNull();
      expect(parseStoredDocumentColumns('{"status":true}')).toBeNull();
      expect(parseStoredDocumentColumns('[1,2]')).toBeNull();
    });

    it('ignora columnas que ya no existen', () => {
      expect(parseStoredDocumentColumns('["vieja","status"]')).toEqual([
        'document',
        'status',
      ]);
    });
  });

  it('reconoce una configuración distinta de la predeterminada', () => {
    expect(isDefaultDocumentColumns(['document'])).toBe(false);
  });
});

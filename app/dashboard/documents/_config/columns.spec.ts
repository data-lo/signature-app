import {
  DEFAULT_VISIBLE_DOCUMENT_COLUMNS,
  DOCUMENT_COLUMNS,
  documentColumnsStorageKey,
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

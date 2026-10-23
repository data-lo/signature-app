import {
  DEFAULT_DOCUMENT_NAME_SORT,
  nextDocumentNameSort,
  sortDocumentsByName,
} from './sorting';

describe('ordenamiento local de documentos por nombre', () => {
  const docs = [
    { id: '1', fileName: 'contrato 10.pdf' },
    { id: '2', fileName: 'Árbol.pdf' },
    { id: '3', fileName: 'contrato 2.pdf' },
    { id: '4', fileName: 'beta.pdf' },
  ];

  it('arranca desactivado', () => {
    expect(DEFAULT_DOCUMENT_NAME_SORT).toBe('none');
  });

  it('la primera activación ordena ascendente y las siguientes alternan', () => {
    expect(nextDocumentNameSort('none')).toBe('asc');
    expect(nextDocumentNameSort('asc')).toBe('desc');
    expect(nextDocumentNameSort('desc')).toBe('asc');
  });

  it('desactivado, devuelve el mismo arreglo en el orden del backend', () => {
    expect(sortDocumentsByName(docs, 'none')).toBe(docs);
  });

  it('ascendente ignora mayúsculas y acentos y compara los números por valor', () => {
    expect(sortDocumentsByName(docs, 'asc').map((d) => d.id)).toEqual([
      '2',
      '4',
      '3',
      '1',
    ]);
  });

  it('descendente invierte el orden', () => {
    expect(sortDocumentsByName(docs, 'desc').map((d) => d.id)).toEqual([
      '1',
      '3',
      '4',
      '2',
    ]);
  });

  it('no modifica el arreglo recibido', () => {
    const before = docs.map((d) => d.id);
    sortDocumentsByName(docs, 'asc');
    expect(docs.map((d) => d.id)).toEqual(before);
  });

  it('los nombres iguales conservan el orden en que llegaron', () => {
    const ties = [
      { id: 'a', fileName: 'igual.pdf' },
      { id: 'b', fileName: 'IGUAL.pdf' },
    ];
    expect(sortDocumentsByName(ties, 'asc').map((d) => d.id)).toEqual([
      'a',
      'b',
    ]);
    expect(sortDocumentsByName(ties, 'desc').map((d) => d.id)).toEqual([
      'a',
      'b',
    ]);
  });
});

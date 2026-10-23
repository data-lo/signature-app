import {
  clampDocumentsPage,
  isDocumentsPageSize,
  lastDocumentsPage,
} from './pagination';

describe('paginación del listado de documentos', () => {
  /** El backend responde `totalPages: 0` sin documentos; la tabla sigue en la página 1. */
  it('la última página nunca es menor que 1', () => {
    expect(lastDocumentsPage(0)).toBe(1);
    expect(lastDocumentsPage(1)).toBe(1);
    expect(lastDocumentsPage(4)).toBe(4);
  });

  it.each([
    [1, 3, 1],
    [2, 3, 2],
    [3, 3, 3],
    [4, 3, 3],
    [0, 3, 1],
    [-2, 3, 1],
    [2, 0, 1],
    [Number.NaN, 3, 1],
  ])('acota la página %p con %p páginas a %p', (page, totalPages, expected) => {
    expect(clampDocumentsPage(page, totalPages)).toBe(expected);
  });

  it('sólo acepta los tamaños de página ofrecidos', () => {
    expect(isDocumentsPageSize(10)).toBe(true);
    expect(isDocumentsPageSize(25)).toBe(true);
    expect(isDocumentsPageSize(50)).toBe(true);
    expect(isDocumentsPageSize(7)).toBe(false);
    expect(isDocumentsPageSize(100)).toBe(false);
  });
});

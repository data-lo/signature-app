import { loadPdfPageSizes } from './pdf-page-sizes';

/** Documento de pdf.js falso: cada página expone su viewport a escala 1. */
function fakePdf(sizes: { width: number; height: number }[]) {
  return {
    numPages: sizes.length,
    getPage: jest.fn(async (pageNumber: number) => ({
      getViewport: ({ scale }: { scale: number }) => ({
        width: sizes[pageNumber - 1].width * scale,
        height: sizes[pageNumber - 1].height * scale,
      }),
    })),
  };
}

describe('loadPdfPageSizes', () => {
  it('devuelve el tamaño de cada página en orden, incluidas las de orientación distinta', async () => {
    const pdf = fakePdf([
      { width: 612, height: 792 },
      { width: 792, height: 612 },
      { width: 595, height: 842 },
    ]);

    await expect(loadPdfPageSizes(pdf as never)).resolves.toEqual([
      { width: 612, height: 792 },
      { width: 792, height: 612 },
      { width: 595, height: 842 },
    ]);
    expect(pdf.getPage).toHaveBeenCalledTimes(3);
  });

  it('funciona con documentos largos sin depender de que las páginas se dibujen', async () => {
    const pdf = fakePdf(
      Array.from({ length: 500 }, () => ({ width: 612, height: 792 })),
    );

    const sizes = await loadPdfPageSizes(pdf as never);

    expect(sizes).toHaveLength(500);
  });

  it('un documento sin páginas devuelve una lista vacía', async () => {
    await expect(loadPdfPageSizes(fakePdf([]) as never)).resolves.toEqual([]);
  });

  it('propaga el fallo si pdf.js no puede leer una página', async () => {
    const pdf = fakePdf([{ width: 612, height: 792 }]);
    pdf.getPage.mockRejectedValueOnce(new Error('página dañada'));

    await expect(loadPdfPageSizes(pdf as never)).rejects.toThrow('página dañada');
  });
});

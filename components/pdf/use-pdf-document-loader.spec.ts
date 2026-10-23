import { act, renderHook, waitFor } from '@testing-library/react';
import { usePdfDocumentLoader } from './use-pdf-document-loader';

function fakePdf(pageCount: number) {
  return {
    numPages: pageCount,
    getPage: jest.fn(async () => ({
      getViewport: () => ({ width: 612, height: 792 }),
    })),
  };
}

describe('usePdfDocumentLoader', () => {
  it('informa el porcentaje descargado cuando se conoce el total', () => {
    const { result } = renderHook(() => usePdfDocumentLoader('https://minio/doc.pdf'));

    act(() => result.current.handleLoadProgress({ loaded: 5, total: 20 }));

    expect(result.current.progress).toBe(25);
  });

  it('sin total conocido no inventa un porcentaje', () => {
    const { result } = renderHook(() => usePdfDocumentLoader('https://minio/doc.pdf'));

    act(() => result.current.handleLoadProgress({ loaded: 5, total: 0 }));

    expect(result.current.progress).toBeNull();
  });

  it('al cargar el documento lee el tamaño de todas las páginas y avisa una vez', async () => {
    const onLoaded = jest.fn();
    const { result } = renderHook(() =>
      usePdfDocumentLoader('https://minio/doc.pdf', onLoaded),
    );

    act(() => result.current.handleLoadSuccess(fakePdf(3) as never));

    await waitFor(() => expect(result.current.pageSizes).toHaveLength(3));
    expect(onLoaded).toHaveBeenCalledTimes(1);
    expect(onLoaded).toHaveBeenCalledWith({
      numPages: 3,
      pageSizes: [
        { width: 612, height: 792 },
        { width: 612, height: 792 },
        { width: 612, height: 792 },
      ],
    });
  });

  it('si no puede leer las páginas queda en error', async () => {
    const pdf = fakePdf(1);
    pdf.getPage.mockRejectedValueOnce(new Error('dañado'));
    const { result } = renderHook(() => usePdfDocumentLoader('https://minio/doc.pdf'));

    act(() => result.current.handleLoadSuccess(pdf as never));

    await waitFor(() => expect(result.current.hasError).toBe(true));
  });

  it('reintentar limpia el error y cambia `attempt` para volver a pedir el archivo', () => {
    const { result } = renderHook(() => usePdfDocumentLoader('https://minio/doc.pdf'));

    act(() => result.current.handleLoadError(new Error('403')));
    expect(result.current.hasError).toBe(true);
    const firstAttempt = result.current.attempt;

    act(() => result.current.retry());

    expect(result.current.hasError).toBe(false);
    expect(result.current.attempt).toBe(firstAttempt + 1);
  });

  it('ignora el resultado de un archivo anterior que llega tarde', async () => {
    let resolveOldPage: (value: unknown) => void = () => {};
    const oldPdf = {
      numPages: 1,
      getPage: jest.fn(
        () =>
          new Promise((resolve) => {
            resolveOldPage = resolve;
          }),
      ),
    };
    const { result, rerender } = renderHook(
      ({ file }) => usePdfDocumentLoader(file),
      { initialProps: { file: 'https://minio/viejo.pdf' } },
    );

    act(() => result.current.handleLoadSuccess(oldPdf as never));
    rerender({ file: 'https://minio/nuevo.pdf' });
    await act(async () => {
      resolveOldPage({ getViewport: () => ({ width: 1, height: 1 }) });
    });

    expect(result.current.pageSizes).toBeNull();
  });
});

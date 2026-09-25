import { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PdfPreview from './PdfPreview';

jest.mock('@/lib/pdf-worker', () => ({}));
jest.mock('react-pdf/dist/Page/AnnotationLayer.css', () => ({}));
jest.mock('react-pdf/dist/Page/TextLayer.css', () => ({}));

/**
 * `<Document>` falso: el primer intento falla (como una URL prefirmada vencida o una red caída) y
 * los siguientes entregan un PDF de dos páginas. Cuenta los montajes para comprobar que
 * "Reintentar" vuelve a pedir el archivo.
 */
let documentMounts = 0;
jest.mock('react-pdf', () => ({
  Document: ({
    children,
    onLoadSuccess,
    onLoadError,
  }: {
    children: React.ReactNode;
    onLoadSuccess: (pdf: unknown) => void;
    onLoadError: (error: Error) => void;
  }) => {
    useEffect(() => {
      documentMounts += 1;
      if (documentMounts === 1) {
        onLoadError(new Error('403'));
      } else {
        onLoadSuccess({
          numPages: 2,
          getPage: async () => ({
            getViewport: () => ({ width: 612, height: 792 }),
          }),
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return <div>{children}</div>;
  },
  Page: ({ pageNumber }: { pageNumber: number }) => (
    <div>Página dibujada {pageNumber}</div>
  ),
}));

describe('PdfPreview', () => {
  beforeEach(() => {
    documentMounts = 0;
  });

  it('si el documento no carga, ofrece reintentar y al hacerlo muestra sus páginas', async () => {
    render(<PdfPreview file="https://minio/doc.pdf" />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /no se pudo cargar el documento/i,
    );

    await userEvent.click(screen.getByRole('button', { name: /reintentar/i }));

    // jsdom no tiene IntersectionObserver: las páginas se dibujan directamente.
    expect(await screen.findByText('Página dibujada 1')).toBeInTheDocument();
    expect(screen.getByText('Página dibujada 2')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(documentMounts).toBe(2);
  });
});

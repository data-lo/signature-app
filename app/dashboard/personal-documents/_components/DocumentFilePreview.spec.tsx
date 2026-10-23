import { renderWithProviders, screen } from '@/test-utils';
import DocumentFilePreview from './DocumentFilePreview';

// El visor real de PDF monta react-pdf (canvas + worker de PDF.js), que jsdom no puede ejecutar:
// se reemplaza por un marcador que deja ver qué archivo recibió.
jest.mock('@/app/dashboard/documents/_components/PdfPreview', () => ({
  __esModule: true,
  default: ({ file }: { file: File | string }) => (
    <div>PdfPreview file={typeof file === 'string' ? file : file.name}</div>
  ),
}));

const OBJECT_URL = 'blob:previsualizacion-local';

beforeAll(() => {
  // jsdom no implementa las URL de objeto que usa la previsualización local.
  URL.createObjectURL = jest.fn(() => OBJECT_URL);
  URL.revokeObjectURL = jest.fn();
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('DocumentFilePreview', () => {
  it('sin archivo: explica que la previsualización aparecerá al elegir uno', () => {
    renderWithProviders(
      <DocumentFilePreview
        source={null}
        label="Firma digital"
        emptyMessage="Aquí verás tu firma digital"
      />,
    );

    expect(screen.getByText('Aquí verás tu firma digital')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('imagen recién elegida: la previsualiza desde un object URL local, sin subirla', () => {
    const file = new File(['firma'], 'firma.png', { type: 'image/png' });

    renderWithProviders(
      <DocumentFilePreview
        source={file}
        label="Firma digital"
        emptyMessage="Aquí verás tu firma digital"
      />,
    );

    expect(URL.createObjectURL).toHaveBeenCalledWith(file);
    expect(
      screen.getByAltText('Previsualización de Firma digital'),
    ).toHaveAttribute('src', OBJECT_URL);
  });

  it('libera el object URL al cambiar de archivo', () => {
    const file = new File(['firma'], 'firma.png', { type: 'image/png' });
    const { unmount } = renderWithProviders(
      <DocumentFilePreview
        source={file}
        label="Firma digital"
        emptyMessage="Aquí verás tu firma digital"
      />,
    );

    unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith(OBJECT_URL);
  });

  it('imagen ya guardada: la previsualiza desde su URL prefirmada', () => {
    renderWithProviders(
      <DocumentFilePreview
        source="https://minio.test/firma.png?X-Amz-Signature=abc"
        label="Firma digital"
        emptyMessage="Aquí verás tu firma digital"
      />,
    );

    expect(
      screen.getByAltText('Previsualización de Firma digital'),
    ).toHaveAttribute(
      'src',
      'https://minio.test/firma.png?X-Amz-Signature=abc',
    );
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('PDF: lo abre en el visor de páginas, tanto antes como después de guardarlo', async () => {
    const file = new File(['ine'], 'ine.pdf', { type: 'application/pdf' });
    const { unmount } = renderWithProviders(
      <DocumentFilePreview
        source={file}
        label="Identificación (INE)"
        emptyMessage="Aquí verás tu identificación"
      />,
    );

    expect(
      await screen.findByText(/PdfPreview file=ine.pdf/),
    ).toBeInTheDocument();
    unmount();

    renderWithProviders(
      <DocumentFilePreview
        source="https://minio.test/ine.pdf?X-Amz-Signature=abc"
        label="Identificación (INE)"
        emptyMessage="Aquí verás tu identificación"
      />,
    );

    expect(
      await screen.findByText(/PdfPreview file=https:\/\/minio.test\/ine.pdf/),
    ).toBeInTheDocument();
  });

  it('formato sin previsualización: ofrece abrir el documento guardado en otra pestaña', () => {
    renderWithProviders(
      <DocumentFilePreview
        source="https://minio.test/ine.docx"
        label="Identificación (INE)"
        emptyMessage="Aquí verás tu identificación"
      />,
    );

    expect(
      screen.getByText('No se puede previsualizar este formato.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /abrir en una pestaña nueva/i }),
    ).toHaveAttribute('href', 'https://minio.test/ine.docx');
  });
});

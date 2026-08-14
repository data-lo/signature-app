import { renderWithProviders, screen } from '@/test-utils';
import PublicDocumentView from './PublicDocumentView';
import { usePublicDocument } from '../_hooks/usePublicDocument';
import { DocumentStatus } from '@/lib/enums/document';
import type { PublicDocumentView as PublicDocumentViewData } from '../_requests';

jest.mock('../_hooks/usePublicDocument');
jest.mock('./PublicPdfViewer', () => ({
  __esModule: true,
  default: ({ file }: { file: string }) => <div>PublicPdfViewer file={file}</div>,
}));

const mockedUsePublicDocument = usePublicDocument as jest.Mock;

function buildData(
  overrides: Partial<PublicDocumentViewData> = {},
): PublicDocumentViewData {
  return {
    id: 'doc-1',
    fileName: 'contrato.pdf',
    status: DocumentStatus.Signed,
    secureUrl: 'https://minio/signed-documents/doc-1',
    expiresIn: 86400,
    ...overrides,
  };
}

describe('PublicDocumentView', () => {
  it('muestra un indicador de carga mientras isLoading es true', () => {
    mockedUsePublicDocument.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    renderWithProviders(<PublicDocumentView documentId="doc-1" />);

    expect(screen.queryByText(/contrato\.pdf/i)).not.toBeInTheDocument();
  });

  it('muestra "Documento no encontrado" si la petición falla (404 / id inválido)', () => {
    mockedUsePublicDocument.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });

    renderWithProviders(<PublicDocumentView documentId="missing" />);

    expect(screen.getByText(/documento no encontrado/i)).toBeInTheDocument();
  });

  // `findByText` y no `getByText`: el visor se carga con `dynamic(..., { ssr: false })` —react-pdf
  // necesita el DOM y con un import estático reventaba el SSR de la página—, así que aparece un
  // tick después del primer render. El encabezado sí es síncrono.
  it('status SIGNED: renderiza el visor con la secureUrl devuelta por el backend', async () => {
    mockedUsePublicDocument.mockReturnValue({
      data: buildData({ status: DocumentStatus.Signed }),
      isLoading: false,
      isError: false,
    });

    renderWithProviders(<PublicDocumentView documentId="doc-1" />);

    expect(
      await screen.findByText(
        'PublicPdfViewer file=https://minio/signed-documents/doc-1',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('contrato.pdf')).toBeInTheDocument();
  });

  it.each([
    DocumentStatus.Pending,
    DocumentStatus.Created,
    DocumentStatus.CancellationPending,
  ])(
    'status %s: muestra "El documento se encuentra en proceso." y no renderiza el visor',
    (status) => {
      mockedUsePublicDocument.mockReturnValue({
        data: buildData({ status, secureUrl: null, expiresIn: null }),
        isLoading: false,
        isError: false,
      });

      renderWithProviders(<PublicDocumentView documentId="doc-1" />);

      expect(
        screen.getByText('El documento se encuentra en proceso.'),
      ).toBeInTheDocument();
      expect(screen.queryByText(/PublicPdfViewer/)).not.toBeInTheDocument();
    },
  );

  it.each([
    DocumentStatus.Rejected,
    DocumentStatus.Expired,
    DocumentStatus.Cancelled,
  ])(
    'status %s: muestra "El documento no está disponible para su consulta." y no renderiza el visor',
    (status) => {
      mockedUsePublicDocument.mockReturnValue({
        data: buildData({ status, secureUrl: null, expiresIn: null }),
        isLoading: false,
        isError: false,
      });

      renderWithProviders(<PublicDocumentView documentId="doc-1" />);

      expect(
        screen.getByText(
          'El documento no está disponible para su consulta.',
        ),
      ).toBeInTheDocument();
      expect(screen.queryByText(/PublicPdfViewer/)).not.toBeInTheDocument();
    },
  );

  it('bug de datos inconsistentes: status SIGNED pero secureUrl null (no debería pasar, el backend lo garantiza) no renderiza el visor', () => {
    mockedUsePublicDocument.mockReturnValue({
      data: buildData({ status: DocumentStatus.Signed, secureUrl: null }),
      isLoading: false,
      isError: false,
    });

    renderWithProviders(<PublicDocumentView documentId="doc-1" />);

    expect(screen.queryByText(/PublicPdfViewer/)).not.toBeInTheDocument();
  });
});

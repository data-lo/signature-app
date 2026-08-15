import { renderWithProviders, screen } from '@/test-utils';
import AdvancedSignatureView from './AdvancedSignatureView';
import { useAdvancedSignature } from '../_hooks/useAdvancedSignature';
import type { AdvancedSignaturePublicView } from '../_requests';

jest.mock('../_hooks/useAdvancedSignature');

const mockedUseAdvancedSignature = useAdvancedSignature as jest.Mock;

function buildData(
  overrides: Partial<AdvancedSignaturePublicView> = {},
): AdvancedSignaturePublicView {
  return {
    documentId: 'doc-1',
    fileName: 'contrato.pdf',
    signerName: 'MANUEL BALDERRAMA CHAVEZ',
    rfc: 'BACM800101ABC',
    certificateSerialNumber: '00001000000512345678',
    signedAt: '2026-08-14T18:24:11.000Z',
    ...overrides,
  };
}

function renderView() {
  return renderWithProviders(
    <AdvancedSignatureView documentId="doc-1" collaboratorId="collab-1" />,
  );
}

/**
 * Historia "Generar código QR para firmas avanzadas": esta es la pantalla a la que lleva el código
 * QR estampado en el documento. La firma avanzada no deja rúbrica visible, así que esto es lo que
 * la hace verificable para quien tiene el documento en la mano.
 */
describe('AdvancedSignatureView', () => {
  it('mientras carga, no muestra datos de la firma', () => {
    mockedUseAdvancedSignature.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    renderView();

    expect(screen.queryByText(/MANUEL/)).not.toBeInTheDocument();
  });

  // Criterio: "la información incluye, como mínimo, el nombre o identificador del firmante y la
  // fecha y hora de firma".
  it('muestra el nombre del firmante y la fecha y hora de la firma', () => {
    mockedUseAdvancedSignature.mockReturnValue({
      data: buildData(),
      isLoading: false,
      isError: false,
    });

    renderView();

    expect(screen.getByText('MANUEL BALDERRAMA CHAVEZ')).toBeInTheDocument();
    expect(screen.getByText('BACM800101ABC')).toBeInTheDocument();
    expect(screen.getByText(/2026/)).toBeInTheDocument();
    expect(screen.getByText('contrato.pdf')).toBeInTheDocument();
    expect(screen.getByText('00001000000512345678')).toBeInTheDocument();
  });

  // El backend responde 404 tanto para una firma inexistente como para una todavía pendiente:
  // en ambos casos no hay constancia que mostrar.
  it('si la firma no existe o sigue pendiente, lo explica en vez de mostrar una constancia vacía', () => {
    mockedUseAdvancedSignature.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });

    renderView();

    expect(screen.getByText(/firma no encontrada/i)).toBeInTheDocument();
    expect(
      screen.getByText(/todavía no se ha completado/i),
    ).toBeInTheDocument();
  });

  // Los datos que el backend puede no tener (firmas anteriores a que se guardara el certificado)
  // se omiten en vez de renderizar una etiqueta con un valor vacío.
  it('omite los datos del certificado cuando la firma no los guardó', () => {
    mockedUseAdvancedSignature.mockReturnValue({
      data: buildData({ rfc: null, certificateSerialNumber: null }),
      isLoading: false,
      isError: false,
    });

    renderView();

    expect(screen.getByText('MANUEL BALDERRAMA CHAVEZ')).toBeInTheDocument();
    expect(screen.queryByText(/^RFC$/)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/número de serie del certificado/i),
    ).not.toBeInTheDocument();
  });

  it('enlaza al documento firmado', () => {
    mockedUseAdvancedSignature.mockReturnValue({
      data: buildData(),
      isLoading: false,
      isError: false,
    });

    renderView();

    expect(
      screen.getByRole('link', { name: /ver el documento firmado/i }),
    ).toHaveAttribute('href', '/public/documents/doc-1');
  });
});

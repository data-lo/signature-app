import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, within } from '@/test-utils';
import PublicDocumentView from './PublicDocumentView';
import { usePublicDocument } from '../_hooks/usePublicDocument';
import { DocumentStatus, SignatureType } from '@/lib/enums/document';
import type {
  PublicDocumentView as PublicDocumentViewData,
  PublicSigner,
} from '../_requests';
import { CanonicalXmlDownloadError } from '../_utils/download-canonical-xml';
import { AuditXmlDownloadError } from '../_utils/download-audit-xml';

jest.mock('../_hooks/usePublicDocument');
jest.mock('./PublicPdfViewer', () => ({
  __esModule: true,
  default: ({ file }: { file: string }) => <div>PublicPdfViewer file={file}</div>,
}));
// La mecánica de decodificar Base64 y disparar la descarga (atob, Blob, URL.createObjectURL) se
// prueba aparte en download-base64-evidence.spec.ts; acá solo importa que el botón la invoque con
// el contenido y el nombre de archivo correctos.
jest.mock('../_utils/download-base64-evidence', () => ({
  downloadBase64Evidence: jest.fn(),
}));
/**
 * Igual que con el Base64: la mecánica de traer el XML, validarlo y guardarlo se prueba en
 * `download-canonical-xml.spec.ts`. `CanonicalXmlDownloadError` se conserva real porque el
 * componente decide por su tipo qué mensaje mostrar.
 */
jest.mock('../_utils/download-canonical-xml', () => ({
  ...jest.requireActual('../_utils/download-canonical-xml'),
  downloadCanonicalXml: jest.fn(),
}));
/**
 * El XML de auditoría se pide igual que el canónico: la mecánica (fetch, comprobación del estatus
 * y guardado del blob) se prueba en `download-audit-xml.spec.ts`. `AuditXmlDownloadError` se
 * conserva real porque el componente decide por su tipo qué mensaje mostrar.
 */
jest.mock('../_utils/download-audit-xml', () => ({
  ...jest.requireActual('../_utils/download-audit-xml'),
  downloadAuditXml: jest.fn(),
}));
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

const mockedUsePublicDocument = usePublicDocument as jest.Mock;
const mockedDownloadBase64Evidence = jest.requireMock(
  '../_utils/download-base64-evidence',
).downloadBase64Evidence as jest.Mock;
const mockedDownloadCanonicalXml = jest.requireMock(
  '../_utils/download-canonical-xml',
).downloadCanonicalXml as jest.Mock;
const mockedDownloadAuditXml = jest.requireMock('../_utils/download-audit-xml')
  .downloadAuditXml as jest.Mock;
const mockedToastError = jest.requireMock('react-hot-toast').default
  .error as jest.Mock;

function buildSigner(overrides: Partial<PublicSigner> = {}): PublicSigner {
  return {
    id: 'collab-1',
    name: 'Isaay Sosa',
    signatureType: SignatureType.Simple,
    signatureTypeLabel: 'Digital Simple',
    legalBacking:
      'Firma Electrónica Simple (Arts. 89, 90 y 93 del Código de Comercio)',
    ipAddress: '187.190.12.4',
    signedAt: '2026-03-15T23:55:00.000Z',
    otpCode: '482915',
    certificateSerialNumber: null,
    electronicSignature: null,
    ...overrides,
  };
}

/** Documento pendiente: el backend manda solo nombres, todo lo demás en null. */
function buildPending(
  overrides: Partial<PublicDocumentViewData> = {},
): PublicDocumentViewData {
  return {
    id: 'doc-1',
    fileName: 'contrato.pdf',
    status: DocumentStatus.Pending,
    isCompleted: false,
    sealingPending: false,
    secureUrl: null,
    expiresIn: null,
    hash: null,
    totalPages: null,
    createdBy: null,
    conservationRecord: null,
    signers: [
      {
        id: 'collab-1',
        name: 'Isaay Sosa',
        signatureType: null,
        signatureTypeLabel: '',
        legalBacking: '',
        ipAddress: '',
        signedAt: null,
        otpCode: null,
        certificateSerialNumber: null,
        electronicSignature: null,
      },
      {
        id: 'collab-2',
        name: 'María López',
        signatureType: null,
        signatureTypeLabel: '',
        legalBacking: '',
        ipAddress: '',
        signedAt: null,
        otpCode: null,
        certificateSerialNumber: null,
        electronicSignature: null,
      },
    ],
    downloads: { nom151: false, timestamp: false, canonical: false },
    sealEvidence: { timestampFileBase64: null, integrityFileBase64: null },
    integrityTsaCertificate: null,
    ...overrides,
  };
}

function buildCompleted(
  overrides: Partial<PublicDocumentViewData> = {},
): PublicDocumentViewData {
  return {
    id: 'doc-1',
    fileName: 'contrato.pdf',
    status: DocumentStatus.Signed,
    isCompleted: true,
    sealingPending: false,
    secureUrl: 'https://minio/finalized-documents/doc-1',
    expiresIn: 86400,
    hash: 'hash-firmado-abc123',
    totalPages: 12,
    createdBy: 'creador@correo.com',
    conservationRecord: {
      tsaCertificate: null,
      serialNumber: null,
      issuedAt: '2026-03-15T23:55:00.000Z',
    },
    signers: [buildSigner()],
    downloads: { nom151: true, timestamp: true, canonical: true },
    sealEvidence: {
      timestampFileBase64: 'dHNyLWVuLWJhc2U2NA==',
      integrityFileBase64: 'bm9tMTUxLWVuLWJhc2U2NA==',
    },
    integrityTsaCertificate: {
      serialNumber: '4A1B2C3D',
      issuedAt: '2026-08-27T18:06:37.000Z',
    },
    ...overrides,
  };
}

function mockData(data: PublicDocumentViewData | undefined) {
  mockedUsePublicDocument.mockReturnValue({
    data,
    isLoading: false,
    isError: false,
  });
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

  /**
   * Documento a medio firmar: aviso, nombre del documento y nombres de los firmantes. Nada más —
   * ni estatus individual, ni evidencia, ni constancia, ni descargas. Esta URL no pide sesión, así
   * que lo que NO se muestra es tan parte de la historia como lo que sí.
   */
  describe('documento pendiente de firmas', () => {
    it('muestra la alerta de advertencia, el nombre del documento y los firmantes', () => {
      mockData(buildPending());

      renderWithProviders(<PublicDocumentView documentId="doc-1" />);

      expect(
        screen.getByText('Este documento aún no se ha completado de firmar.'),
      ).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveAttribute(
        'data-variant',
        'warning',
      );
      expect(screen.getByText('contrato.pdf')).toBeInTheDocument();
      expect(screen.getByText('Isaay Sosa')).toBeInTheDocument();
      expect(screen.getByText('María López')).toBeInTheDocument();
      // Por rol y no por texto: los títulos de sección tienen que ser encabezados de verdad.
      // Es una pantalla de consulta que se abre desde el teléfono tras escanear un QR, y sin
      // encabezados un lector de pantalla no puede saltar entre secciones.
      expect(
        screen.getByRole('heading', { name: /firmantes requeridos/i }),
      ).toBeInTheDocument();
    });

    it('no muestra evidencia, información de PSC, descargas ni el visor', () => {
      mockData(buildPending());

      renderWithProviders(<PublicDocumentView documentId="doc-1" />);

      expect(screen.queryByText(/^hash$/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/^ip$/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/^sustentada$/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/nom-151/i)).not.toBeInTheDocument();
      expect(
        screen.queryByRole('link', { name: /constancia nom-151/i }),
      ).not.toBeInTheDocument();
      expect(screen.queryByText(/PublicPdfViewer/)).not.toBeInTheDocument();
      // El XML de auditoría sólo se ofrece para documentos firmados: mientras la firma no se
      // completa no hay expediente que auditar, y esta URL no pide sesión.
      expect(
        screen.queryByRole('button', { name: /xml de auditoría/i }),
      ).not.toBeInTheDocument();
    });

    /**
     * Un documento rechazado/cancelado/expirado tampoco está completado, pero ya nunca lo va a
     * estar: el aviso no debe dejar a quien consulta esperando una firma que no va a llegar.
     */
    it.each([
      [DocumentStatus.Rejected, /lo rechazó/i],
      [DocumentStatus.Cancelled, /fue cancelado/i],
      [DocumentStatus.Expired, /venció su fecha límite/i],
    ])('status %s: el aviso dice que ya no se completará', (status, matcher) => {
      mockData(buildPending({ status }));

      renderWithProviders(<PublicDocumentView documentId="doc-1" />);

      expect(screen.getByText(matcher)).toBeInTheDocument();
      expect(
        screen.queryByText('Este documento aún no se ha completado de firmar.'),
      ).not.toBeInTheDocument();
    });
  });

  describe('documento completado', () => {
    it('muestra la alerta de éxito y la información del documento', () => {
      mockData(buildCompleted());

      renderWithProviders(<PublicDocumentView documentId="doc-1" />);

      expect(
        screen.getByText(
          'Este documento ha sido firmado por todos sus participantes.',
        ),
      ).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveAttribute(
        'data-variant',
        'success',
      );
      // Mismo criterio que en el panel de pendiente: las cinco secciones son encabezados.
      for (const titulo of [
        /información del documento/i,
        /constancia de conservación \(nom-151\)/i,
        /^firmantes$/i,
        /descargas disponibles/i,
      ]) {
        expect(screen.getByRole('heading', { name: titulo })).toBeInTheDocument();
      }
      expect(screen.getByText('doc-1')).toBeInTheDocument();
      expect(screen.getByText('hash-firmado-abc123')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('creador@correo.com')).toBeInTheDocument();
    });

    // `findByText`: el visor se carga con `dynamic(..., { ssr: false })` —react-pdf necesita el
    // DOM y con un import estático reventaba el SSR de la página—, así que aparece un tick después
    // del primer render.
    it('renderiza el visor con la secureUrl devuelta por el backend', async () => {
      mockData(buildCompleted());

      renderWithProviders(<PublicDocumentView documentId="doc-1" />);

      expect(
        await screen.findByText(
          'PublicPdfViewer file=https://minio/finalized-documents/doc-1',
        ),
      ).toBeInTheDocument();
    });

    it('bug de datos inconsistentes: completado pero sin secureUrl no renderiza el visor', () => {
      mockData(buildCompleted({ secureUrl: null }));

      renderWithProviders(<PublicDocumentView documentId="doc-1" />);

      expect(screen.queryByText(/PublicPdfViewer/)).not.toBeInTheDocument();
    });

    describe('constancia de conservación (NOM-151)', () => {
      it('muestra la fecha de emisión y omite los renglones que el PSC no expone', () => {
        mockData(buildCompleted());

        renderWithProviders(<PublicDocumentView documentId="doc-1" />);

        expect(screen.getByText(/fecha de emisión/i)).toBeInTheDocument();
        // tsaCertificate y serialNumber (los del token RFC 3161) llegan en null: ese renglón
        // exacto no se pinta — distinto de "Serie/Emisión del certificado (TSA)", que sí se
        // pintan porque vienen de integrityTsaCertificate (ver el describe de más abajo).
        expect(
          screen.queryByText(/^certificado \(tsa\)$/i),
        ).not.toBeInTheDocument();
        expect(screen.queryByText(/^número de serie$/i)).not.toBeInTheDocument();
      });

      /**
       * Distinto de "no le corresponde": aquí la constancia SÍ va a llegar. Se firmó mientras el
       * servicio del SAT no respondía, así que la comprobación de revocación quedó pendiente y
       * con ella el sellado. Decirlo evita que el usuario lea un hueco como un fallo definitivo.
       */
      it('pendiente de sellar: avisa que la constancia está por emitirse', () => {
        mockData(
          buildCompleted({ conservationRecord: null, sealingPending: true }),
        );

        renderWithProviders(<PublicDocumentView documentId="doc-1" />);

        expect(
          screen.getByText(/constancia de conservación .* pendiente de emitirse/i),
        ).toBeInTheDocument();
        // No debe leerse como que el documento no tiene constancia y punto.
        expect(
          screen.queryByText(/no cuenta con una constancia/i),
        ).not.toBeInTheDocument();
      });

      it('sin constancia: lo dice en vez de dejar la sección vacía', () => {
        mockData(buildCompleted({ conservationRecord: null }));

        renderWithProviders(<PublicDocumentView documentId="doc-1" />);

        expect(
          screen.getByText(
            /no cuenta con una constancia de conservación emitida por un psc/i,
          ),
        ).toBeInTheDocument();
      });

      describe('certificado TSA de la evidencia NOM-151', () => {
        it('muestra la serie y la fecha de emisión del certificado cuando el backend las extrajo', () => {
          mockData(buildCompleted());

          renderWithProviders(<PublicDocumentView documentId="doc-1" />);

          expect(
            screen.getByText(/serie del certificado \(tsa\)/i),
          ).toBeInTheDocument();
          expect(screen.getByText('4A1B2C3D')).toBeInTheDocument();
          expect(
            screen.getByText(/emisión del certificado \(tsa\)/i),
          ).toBeInTheDocument();
        });

        it('no muestra el componente si el backend no pudo extraer el certificado', () => {
          mockData(buildCompleted({ integrityTsaCertificate: null }));

          renderWithProviders(<PublicDocumentView documentId="doc-1" />);

          expect(
            screen.queryByText(/serie del certificado \(tsa\)/i),
          ).not.toBeInTheDocument();
          expect(
            screen.queryByText(/emisión del certificado \(tsa\)/i),
          ).not.toBeInTheDocument();
        });
      });
    });

    describe('evidencia según el tipo de firma', () => {
      it('firma simple: muestra OTP y oculta los campos de la firma avanzada', () => {
        mockData(buildCompleted({ signers: [buildSigner()] }));

        renderWithProviders(<PublicDocumentView documentId="doc-1" />);

        const card = screen.getByText('Isaay Sosa').closest('[data-slot="signer-evidence"]');
        const evidence = within(card as HTMLElement);

        expect(evidence.getByText('Digital Simple')).toBeInTheDocument();
        expect(evidence.getByText(/otp code/i)).toBeInTheDocument();
        expect(evidence.getByText('482915')).toBeInTheDocument();
        expect(evidence.getByText(/arts\. 89, 90 y 93/i)).toBeInTheDocument();

        expect(
          evidence.queryByText(/número de serie del certificado/i),
        ).not.toBeInTheDocument();
        expect(
          evidence.queryByText(/^firma electrónica$/i),
        ).not.toBeInTheDocument();
      });

      /**
       * La ubicación desde la que firmó una persona no se publica en una pantalla que abre
       * cualquiera con el id del documento, sin sesión. Se sigue capturando como evidencia y la
       * hoja de firmas del PDF la imprime; lo que no puede es viajar por esta ruta.
       */
      it('ninguna tarjeta muestra la geolocalización del firmante', () => {
        mockData(
          buildCompleted({
            signers: [
              buildSigner(),
              buildSigner({ id: 'collab-2', name: 'María López' }),
            ],
          }),
        );

        renderWithProviders(<PublicDocumentView documentId="doc-1" />);

        expect(screen.queryByText(/geolocalizaci/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/19\.4326/)).not.toBeInTheDocument();
      });

      it('firma avanzada: muestra certificado y firma electrónica, y oculta el OTP', () => {
        mockData(
          buildCompleted({
            signers: [
              buildSigner({
                id: 'collab-2',
                name: 'MANUEL BALDERRAMA CHAVEZ',
                signatureType: SignatureType.Fiel,
                signatureTypeLabel: 'Firma Electronica Avanzada',
                legalBacking:
                  'Certificado emitido por el Sistema de Administración Tributaria PSC (Art. 97 del Código de Comercio)',
                otpCode: null,
                certificateSerialNumber: '00001000000512345678',
                electronicSignature: 'MEUCIQDf-firma-base64',
              }),
            ],
          }),
        );

        renderWithProviders(<PublicDocumentView documentId="doc-1" />);

        const card = screen
          .getByText('MANUEL BALDERRAMA CHAVEZ')
          .closest('[data-slot="signer-evidence"]');
        const evidence = within(card as HTMLElement);

        expect(
          evidence.getByText('Firma Electronica Avanzada'),
        ).toBeInTheDocument();
        expect(
          evidence.getByText('00001000000512345678'),
        ).toBeInTheDocument();
        expect(
          evidence.getByText('MEUCIQDf-firma-base64'),
        ).toBeInTheDocument();
        expect(evidence.getByText(/art\. 97/i)).toBeInTheDocument();

        expect(evidence.queryByText(/otp code/i)).not.toBeInTheDocument();
      });

      it('con varios firmantes de distinto tipo, cada tarjeta muestra lo suyo', () => {
        mockData(
          buildCompleted({
            signers: [
              buildSigner(),
              buildSigner({
                id: 'collab-2',
                name: 'María López',
                signatureType: SignatureType.Fiel,
                signatureTypeLabel: 'Firma Electronica Avanzada',
                otpCode: null,
                certificateSerialNumber: '00001000000598765432',
                electronicSignature: 'otra-firma-base64',
              }),
            ],
          }),
        );

        renderWithProviders(<PublicDocumentView documentId="doc-1" />);

        expect(
          document.querySelectorAll('[data-slot="signer-evidence"]'),
        ).toHaveLength(2);
        expect(screen.getByText('482915')).toBeInTheDocument();
        expect(screen.getByText('00001000000598765432')).toBeInTheDocument();
      });
    });

    describe('descargas disponibles', () => {
      it('ofrece el XML de auditoría en un documento completado', () => {
        mockData(buildCompleted());

        renderWithProviders(<PublicDocumentView documentId="doc-1" />);

        expect(
          screen.getByRole('button', { name: /descargar xml de auditoría/i }),
        ).toBeEnabled();
      });

      it('pide el XML de auditoría al backend al hacer clic', async () => {
        const user = userEvent.setup();
        mockData(buildCompleted());

        renderWithProviders(<PublicDocumentView documentId="doc-1" />);

        await user.click(
          screen.getByRole('button', { name: /descargar xml de auditoría/i }),
        );

        expect(mockedDownloadAuditXml).toHaveBeenCalledWith(
          '/api/document/public/doc-1/audit-xml',
          'auditoria-doc-1.xml',
        );
      });

      /**
       * El expediente se arma con evidencia que puede faltar (un PDF ilegible en su bucket): si el
       * backend responde un error controlado, se avisa y no se guarda un archivo a medias.
       */
      it('avisa y no descarga nada si el XML de auditoría no se puede generar', async () => {
        const user = userEvent.setup();
        mockedDownloadAuditXml.mockRejectedValueOnce(
          new AuditXmlDownloadError(
            'Este documento no tiene XML de auditoría disponible.',
          ),
        );
        mockData(buildCompleted());

        renderWithProviders(<PublicDocumentView documentId="doc-1" />);

        await user.click(
          screen.getByRole('button', { name: /descargar xml de auditoría/i }),
        );

        expect(mockedToastError).toHaveBeenCalledWith(
          'Este documento no tiene XML de auditoría disponible.',
        );
      });

      /**
       * El XML de auditoría no es una pieza de la constancia del PSC: existe aunque el documento
       * nunca se haya sellado, así que el aviso de "sin constancia descargable" no puede llevárselo
       * por delante.
       */
      it('sigue ofreciendo el XML de auditoría en un documento sin constancia', () => {
        mockData(
          buildCompleted({
            downloads: { nom151: false, timestamp: false, canonical: false },
            sealEvidence: {
              timestampFileBase64: null,
              integrityFileBase64: null,
            },
          }),
        );

        renderWithProviders(<PublicDocumentView documentId="doc-1" />);

        expect(
          screen.getByRole('button', { name: /descargar xml de auditoría/i }),
        ).toBeEnabled();
        expect(
          screen.getByText(/no tiene constancia de conservación descargable/i),
        ).toBeInTheDocument();
      });

      it('ofrece los tres artefactos habilitados', () => {
        mockData(buildCompleted());

        renderWithProviders(<PublicDocumentView documentId="doc-1" />);

        expect(
          screen.getByRole('button', { name: /constancia nom-151/i }),
        ).toBeEnabled();
        expect(
          screen.getByRole('button', { name: /sello de tiempo/i }),
        ).toBeEnabled();
        expect(
          screen.getByRole('button', { name: /xml canónico/i }),
        ).toBeEnabled();
      });

      it('descarga el XML canónico consultando el sello al hacer clic', async () => {
        const user = userEvent.setup();
        mockData(buildCompleted());

        renderWithProviders(<PublicDocumentView documentId="doc-1" />);

        await user.click(screen.getByRole('button', { name: /xml canónico/i }));

        expect(mockedDownloadCanonicalXml).toHaveBeenCalledWith(
          '/api/document/public/doc-1/seal/canonical',
          'cadena-canonica-doc-1.xml',
        );
      });

      /**
       * El criterio de aceptación que motiva no usar un enlace directo: si la descarga falla, se
       * avisa y NO se guarda nada. Un `<a href download>` habría guardado el cuerpo del error.
       */
      it('avisa y no descarga nada si el XML canónico no se puede obtener', async () => {
        const user = userEvent.setup();
        mockedDownloadCanonicalXml.mockRejectedValueOnce(
          new CanonicalXmlDownloadError(
            'Este documento no tiene XML canónico disponible.',
          ),
        );
        mockData(buildCompleted());

        renderWithProviders(<PublicDocumentView documentId="doc-1" />);

        await user.click(screen.getByRole('button', { name: /xml canónico/i }));

        expect(mockedToastError).toHaveBeenCalledWith(
          'Este documento no tiene XML canónico disponible.',
        );
      });

      it('decodifica el Base64 de cada evidencia en el navegador al hacer clic en su botón', async () => {
        const user = userEvent.setup();
        mockData(buildCompleted());

        renderWithProviders(<PublicDocumentView documentId="doc-1" />);

        await user.click(
          screen.getByRole('button', { name: /constancia nom-151/i }),
        );
        expect(mockedDownloadBase64Evidence).toHaveBeenCalledWith(
          'bm9tMTUxLWVuLWJhc2U2NA==',
          'nom151-doc-1.der',
        );

        await user.click(
          screen.getByRole('button', { name: /sello de tiempo/i }),
        );
        expect(mockedDownloadBase64Evidence).toHaveBeenCalledWith(
          'dHNyLWVuLWJhc2U2NA==',
          'sello-de-tiempo-doc-1.tsr',
        );

        // El XML canónico no se decodifica de Base64: se pide al backend ya envuelto en XML.
        expect(mockedDownloadBase64Evidence).toHaveBeenCalledTimes(2);
      });

      it('deshabilita el botón de una evidencia que el documento no tiene, sin ocultar las demás', () => {
        mockData(
          buildCompleted({
            downloads: { nom151: false, timestamp: true, canonical: false },
            sealEvidence: {
              timestampFileBase64: 'dHNyLWVuLWJhc2U2NA==',
              integrityFileBase64: null,
            },
          }),
        );

        renderWithProviders(<PublicDocumentView documentId="doc-1" />);

        expect(
          screen.getByRole('button', { name: /sello de tiempo/i }),
        ).toBeEnabled();
        expect(
          screen.getByRole('button', { name: /constancia nom-151/i }),
        ).toBeDisabled();
        // Se deshabilita, no se oculta: mismo criterio que las otras dos evidencias.
        expect(
          screen.getByRole('button', { name: /xml canónico/i }),
        ).toBeDisabled();
      });

      it('sin ningún artefacto, lo dice en vez de dejar la sección vacía', () => {
        mockData(
          buildCompleted({
            downloads: { nom151: false, timestamp: false, canonical: false },
            sealEvidence: {
              timestampFileBase64: null,
              integrityFileBase64: null,
            },
          }),
        );

        renderWithProviders(<PublicDocumentView documentId="doc-1" />);

        expect(
          screen.getByText(/no tiene constancia de conservación descargable/i),
        ).toBeInTheDocument();
      });
    });
  });
});

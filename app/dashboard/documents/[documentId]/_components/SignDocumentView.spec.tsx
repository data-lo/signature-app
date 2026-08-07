import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, within } from '@/test-utils';
import SignDocumentView from './SignDocumentView';
import { useDocumentDetail } from '../_hooks/useDocumentDetail';
import { useDocumentFileUrl } from '../../_hooks/useDocumentFileUrl';
import { useSignDocument } from '../_hooks/useSignDocument';
import { useRejectDocument } from '../_hooks/useRejectDocument';
import { useRequestCancellation } from '../_hooks/useRequestCancellation';
import { useConfirmCancellation } from '../_hooks/useConfirmCancellation';
import { useRequestVerificationCode } from '../_hooks/useRequestVerificationCode';
import { useVerifyCode } from '../_hooks/useVerifyCode';
import { useAuthStore } from '@/lib/store/useAuthStore';
import type { AuthUser } from '@/lib/store/types/auth-store.types';
import type { DocumentDetail } from '../_requests';
import {
  DocumentStatus,
  ParticipantRole,
  ParticipantStatus,
  SignatureType,
} from '@/lib/enums/document';

jest.mock('../_hooks/useDocumentDetail');
jest.mock('../../_hooks/useDocumentFileUrl');
jest.mock('../_hooks/useSignDocument');
jest.mock('../_hooks/useRejectDocument');
jest.mock('../_hooks/useRequestCancellation');
jest.mock('../_hooks/useConfirmCancellation');
jest.mock('../_hooks/useRequestVerificationCode');
jest.mock('../_hooks/useVerifyCode');
jest.mock('../../_components/PdfPreview', () => ({
  __esModule: true,
  default: ({ file }: { file: string }) => <div>PDF preview: {file}</div>,
}));
jest.mock('./EfirmaFilePicker', () => ({
  __esModule: true,
  default: ({
    extension,
    onFileSelected,
  }: {
    extension: string;
    fileLabel: string;
    onFileSelected: (file: File | null) => void;
  }) => (
    <button
      type="button"
      onClick={() =>
        onFileSelected(
          new File(['contenido'], `archivo.${extension}`, {
            type: 'application/octet-stream',
          }),
        )
      }
    >
      {`Seleccionar archivo .${extension} de prueba`}
    </button>
  ),
}));

const mockedUseDocumentDetail = useDocumentDetail as jest.Mock;
const mockedUseDocumentFileUrl = useDocumentFileUrl as jest.Mock;
const mockedUseSignDocument = useSignDocument as jest.Mock;
const mockedUseRejectDocument = useRejectDocument as jest.Mock;
const mockedUseRequestCancellation = useRequestCancellation as jest.Mock;
const mockedUseConfirmCancellation = useConfirmCancellation as jest.Mock;
const mockedUseRequestVerificationCode =
  useRequestVerificationCode as jest.Mock;
const mockedUseVerifyCode = useVerifyCode as jest.Mock;

function baseDocument(
  overrides: Partial<DocumentDetail> = {},
): DocumentDetail {
  return {
    id: 'doc-1',
    fileName: 'contrato.pdf',
    fileType: 'application/pdf',
    totalPages: 1,
    status: DocumentStatus.Pending,
    creator: 'Creador Uno',
    // Distinto del secureUrl que devuelve el mock de useDocumentFileUrl a propósito: algunas
    // pruebas verifican que el visor use el del endpoint dedicado, no este (ver bug corregido).
    secureUrl: 'https://minio/stale-detail-url',
    expiresIn: 3600,
    participants: [],
    myRole: ParticipantRole.Signer,
    myStatus: ParticipantStatus.Pending,
    mySignatureType: null,
    canSign: false,
    canReject: false,
    canRequestCancellation: false,
    canConfirmCancellation: false,
    requiresVerification: false,
    verificationConfirmed: false,
    ...overrides,
  };
}

function buildUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'user-1',
    email: 'juan@empresa.com',
    identificationNumber: 'PELJ850101HDFRNN08',
    name: 'Juan',
    lastName: 'Pérez',
    isConfigured: false,
    personalConfigured: false,
    signatureConfigured: false,
    ...overrides,
  };
}

describe('SignDocumentView', () => {
  const signMutate = jest.fn();
  const rejectMutate = jest.fn();
  const requestCancellationMutate = jest.fn();
  const confirmCancellationMutate = jest.fn();

  beforeEach(() => {
    signMutate.mockReset();
    rejectMutate.mockReset();
    requestCancellationMutate.mockReset();
    confirmCancellationMutate.mockReset();
    useAuthStore.setState({ user: buildUser({ signatureConfigured: true }) });

    mockedUseSignDocument.mockReturnValue({
      mutate: signMutate,
      isPending: false,
    });
    mockedUseRejectDocument.mockReturnValue({
      mutate: rejectMutate,
      isPending: false,
    });
    mockedUseRequestCancellation.mockReturnValue({
      mutate: requestCancellationMutate,
      isPending: false,
    });
    mockedUseConfirmCancellation.mockReturnValue({
      mutate: confirmCancellationMutate,
      isPending: false,
    });
    mockedUseRequestVerificationCode.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    });
    mockedUseVerifyCode.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    });
    mockedUseDocumentFileUrl.mockReturnValue({
      data: { fileId: 'obj-1', secureUrl: 'https://minio/file', expiresIn: 86400 },
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: jest.fn(),
    });
  });

  it('muestra el botón de firmar cuando es el turno del usuario', async () => {
    mockedUseDocumentDetail.mockReturnValue({
      data: baseDocument({ canSign: true, canReject: true }),
      isLoading: false,
      isError: false,
    });
    const user = userEvent.setup();
    renderWithProviders(<SignDocumentView documentId="doc-1" />);

    await user.click(
      screen.getByRole('button', { name: /continuar a firmar/i }),
    );

    expect(signMutate).toHaveBeenCalled();
  });

  it('bug corregido: si el documento requiere verificación y aún no se confirma, oculta "Continuar a firmar" y muestra el flujo de código en su lugar', async () => {
    const requestCodeMutate = jest.fn((_vars, opts) => opts?.onSuccess?.());
    mockedUseRequestVerificationCode.mockReturnValue({
      mutate: requestCodeMutate,
      isPending: false,
    });
    const verifyCodeMutate = jest.fn();
    mockedUseVerifyCode.mockReturnValue({
      mutate: verifyCodeMutate,
      isPending: false,
    });
    mockedUseDocumentDetail.mockReturnValue({
      data: baseDocument({
        canSign: true,
        canReject: true,
        requiresVerification: true,
        verificationConfirmed: false,
      }),
      isLoading: false,
      isError: false,
    });
    const user = userEvent.setup();
    renderWithProviders(<SignDocumentView documentId="doc-1" />);

    expect(
      screen.queryByRole('button', { name: /continuar a firmar/i }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /solicitar código de verificación/i }),
    );
    expect(requestCodeMutate).toHaveBeenCalled();

    await user.type(
      screen.getByPlaceholderText(/código de verificación/i),
      '123456',
    );
    await user.click(screen.getByRole('button', { name: /verificar código/i }));

    expect(verifyCodeMutate).toHaveBeenCalledWith(
      '123456',
      expect.anything(),
    );
  });

  it('muestra "Continuar a firmar" directamente cuando la verificación ya fue confirmada', () => {
    mockedUseDocumentDetail.mockReturnValue({
      data: baseDocument({
        canSign: true,
        canReject: true,
        requiresVerification: true,
        verificationConfirmed: true,
      }),
      isLoading: false,
      isError: false,
    });
    renderWithProviders(<SignDocumentView documentId="doc-1" />);

    expect(
      screen.getByRole('button', { name: /continuar a firmar/i }),
    ).toBeInTheDocument();
  });

  it('permite rechazar con un motivo', async () => {
    mockedUseDocumentDetail.mockReturnValue({
      data: baseDocument({ canSign: true, canReject: true }),
      isLoading: false,
      isError: false,
    });
    const user = userEvent.setup();
    renderWithProviders(<SignDocumentView documentId="doc-1" />);

    await user.click(
      screen.getByRole('button', { name: /rechazar documento/i }),
    );
    await user.type(
      screen.getByPlaceholderText(/explica detalladamente/i),
      'El documento tiene un error',
    );
    await user.click(screen.getByRole('button', { name: /^rechazar$/i }));

    expect(rejectMutate).toHaveBeenCalledWith('El documento tiene un error');
  });

  it('bug corregido: si el documento requiere firma simple y el usuario no la tiene configurada, deshabilita/atenúa la firma y muestra la leyenda explicativa', () => {
    useAuthStore.setState({ user: buildUser({ signatureConfigured: false }) });
    mockedUseDocumentDetail.mockReturnValue({
      data: baseDocument({
        canSign: true,
        canReject: true,
        mySignatureType: SignatureType.Simple,
      }),
      isLoading: false,
      isError: false,
    });
    renderWithProviders(<SignDocumentView documentId="doc-1" />);

    expect(
      screen.getByText(
        /para firmar documentos con tu firma digital simple, esta debe estar configurada/i,
      ),
    ).toBeInTheDocument();

    const signButton = screen.getByRole('button', {
      name: /continuar a firmar/i,
      hidden: true,
    });
    const wrapper = signButton.parentElement?.parentElement;
    expect(wrapper).toHaveAttribute('inert');
    expect(wrapper).toHaveAttribute('aria-disabled', 'true');
    expect(wrapper?.className).toContain('opacity-50');
    expect(wrapper?.className).toContain('pointer-events-none');
  });

  it('bug corregido: al acceder por ruta directa sin firma simple configurada, bloquea el documento con un overlay y despliega un modal de alerta', () => {
    useAuthStore.setState({ user: buildUser({ signatureConfigured: false }) });
    mockedUseDocumentDetail.mockReturnValue({
      data: baseDocument({
        canSign: true,
        canReject: true,
        mySignatureType: SignatureType.Simple,
      }),
      isLoading: false,
      isError: false,
    });
    renderWithProviders(<SignDocumentView documentId="doc-1" />);

    expect(
      screen.getAllByText(
        /tu firma no ha sido configurada\. por favor confígurala para continuar/i,
      ).length,
    ).toBeGreaterThan(0);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /configurar firma/i }),
    ).toHaveAttribute('href', '/dashboard/personal-documents/identity');
  });

  it('no bloquea el documento ni abre el modal de firma cuando el documento no requiere firma simple', () => {
    useAuthStore.setState({ user: buildUser({ signatureConfigured: false }) });
    mockedUseDocumentDetail.mockReturnValue({
      data: baseDocument({
        canSign: true,
        canReject: true,
        mySignatureType: SignatureType.Fiel,
      }),
      isLoading: false,
      isError: false,
    });
    renderWithProviders(<SignDocumentView documentId="doc-1" />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      screen.queryByText(/tu firma no ha sido configurada/i),
    ).not.toBeInTheDocument();
  });

  it('no muestra la leyenda de firma simple cuando el usuario ya la tiene configurada', () => {
    useAuthStore.setState({ user: buildUser({ signatureConfigured: true }) });
    mockedUseDocumentDetail.mockReturnValue({
      data: baseDocument({
        canSign: true,
        canReject: true,
        mySignatureType: SignatureType.Simple,
      }),
      isLoading: false,
      isError: false,
    });
    renderWithProviders(<SignDocumentView documentId="doc-1" />);

    expect(
      screen.queryByText(/esta debe estar configurada/i),
    ).not.toBeInTheDocument();
    const signButton = screen.getByRole('button', {
      name: /continuar a firmar/i,
    });
    expect(signButton.parentElement?.parentElement).not.toHaveAttribute(
      'inert',
    );
  });

  it('muestra un mensaje cuando no es el turno del usuario', () => {
    mockedUseDocumentDetail.mockReturnValue({
      data: baseDocument({
        canSign: false,
        canReject: false,
        myStatus: ParticipantStatus.Pending,
      }),
      isLoading: false,
      isError: false,
    });
    renderWithProviders(<SignDocumentView documentId="doc-1" />);

    expect(
      screen.getByText(/aún no es tu turno para firmar este documento/i),
    ).toBeInTheDocument();
  });

  it('permite al creador solicitar la cancelación de un documento firmado', async () => {
    mockedUseDocumentDetail.mockReturnValue({
      data: baseDocument({
        status: DocumentStatus.Signed,
        myRole: ParticipantRole.Creator,
        myStatus: null,
        canRequestCancellation: true,
      }),
      isLoading: false,
      isError: false,
    });
    const user = userEvent.setup();
    renderWithProviders(<SignDocumentView documentId="doc-1" />);

    await user.click(
      screen.getByRole('button', { name: /solicitar cancelación/i }),
    );
    const dialog = await screen.findByRole('dialog');
    await user.click(
      within(dialog).getByRole('button', { name: /solicitar cancelación/i }),
    );

    expect(requestCancellationMutate).toHaveBeenCalled();
  });

  it('permite a un firmante confirmar la cancelación pendiente', async () => {
    mockedUseDocumentDetail.mockReturnValue({
      data: baseDocument({
        status: DocumentStatus.CancellationPending,
        canConfirmCancellation: true,
      }),
      isLoading: false,
      isError: false,
    });
    const user = userEvent.setup();
    renderWithProviders(<SignDocumentView documentId="doc-1" />);

    await user.click(
      screen.getByRole('button', { name: /confirmar cancelación/i }),
    );
    const dialog = await screen.findByRole('dialog');
    await user.click(
      within(dialog).getByRole('button', { name: /confirmar cancelación/i }),
    );

    expect(confirmCancellationMutate).toHaveBeenCalled();
  });

  it('bug corregido: pide el secureUrl del archivo por separado del detalle del documento y muestra un loader propio mientras llega', () => {
    mockedUseDocumentDetail.mockReturnValue({
      data: baseDocument({ canSign: true, canReject: true }),
      isLoading: false,
      isError: false,
    });
    mockedUseDocumentFileUrl.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      isFetching: true,
      refetch: jest.fn(),
    });
    renderWithProviders(<SignDocumentView documentId="doc-1" />);

    expect(screen.getByText(/cargando documento/i)).toBeInTheDocument();
    expect(screen.queryByText(/pdf preview/i)).not.toBeInTheDocument();
  });

  it('bug corregido: si falla la obtención del secureUrl del archivo, ofrece un botón para reintentar en vez de quedarse sin explicación', async () => {
    const refetchFileUrl = jest.fn();
    mockedUseDocumentDetail.mockReturnValue({
      data: baseDocument({ canSign: true, canReject: true }),
      isLoading: false,
      isError: false,
    });
    mockedUseDocumentFileUrl.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      isFetching: false,
      refetch: refetchFileUrl,
    });
    const user = userEvent.setup();
    renderWithProviders(<SignDocumentView documentId="doc-1" />);

    expect(
      screen.getByText(/no se pudo cargar el archivo del documento/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/pdf preview/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /reintentar/i }));
    expect(refetchFileUrl).toHaveBeenCalled();
  });

  it('bug corregido: renderiza el PDF con el secureUrl obtenido del endpoint dedicado, no con el del detalle del documento', () => {
    mockedUseDocumentDetail.mockReturnValue({
      data: baseDocument({ canSign: true, canReject: true }),
      isLoading: false,
      isError: false,
    });
    renderWithProviders(<SignDocumentView documentId="doc-1" />);

    expect(screen.getByText('PDF preview: https://minio/file')).toBeInTheDocument();
    expect(screen.queryByText(/stale-detail-url/i)).not.toBeInTheDocument();
  });

  describe('firma electrónica avanzada (FIEL)', () => {
    function renderFielDocument() {
      mockedUseDocumentDetail.mockReturnValue({
        data: baseDocument({
          canSign: true,
          canReject: true,
          mySignatureType: SignatureType.Fiel,
        }),
        isLoading: false,
        isError: false,
      });
      return renderWithProviders(<SignDocumentView documentId="doc-1" />);
    }

    it('al hacer clic en "Continuar a firmar" abre el diálogo de e.firma en vez de firmar directamente', async () => {
      const user = userEvent.setup();
      renderFielDocument();

      await user.click(
        screen.getByRole('button', { name: /continuar a firmar/i }),
      );

      expect(
        await screen.findByText(/firma electrónica avanzada \(e\.firma\)/i),
      ).toBeInTheDocument();
      expect(signMutate).not.toHaveBeenCalled();
    });

    it('al completar y enviar el formulario de e.firma, llama a signMutate con la contraseña y los archivos', async () => {
      const user = userEvent.setup();
      renderFielDocument();

      await user.click(
        screen.getByRole('button', { name: /continuar a firmar/i }),
      );
      const dialog = await screen.findByRole('dialog');

      await user.click(
        within(dialog).getByRole('button', {
          name: /seleccionar archivo \.key/i,
        }),
      );
      await user.click(
        within(dialog).getByRole('button', {
          name: /seleccionar archivo \.cer/i,
        }),
      );
      await user.type(
        within(dialog).getByLabelText(/contraseña de la llave privada/i),
        'MiContraseña123',
      );
      await user.click(
        within(dialog).getByRole('button', { name: /firmar documento/i }),
      );

      expect(signMutate).toHaveBeenCalledWith(
        {
          password: 'MiContraseña123',
          keyFile: expect.any(File),
          cerFile: expect.any(File),
        },
        expect.anything(),
      );
    });

    it('cancelar el diálogo de e.firma lo cierra sin firmar', async () => {
      const user = userEvent.setup();
      renderFielDocument();

      await user.click(
        screen.getByRole('button', { name: /continuar a firmar/i }),
      );
      const dialog = await screen.findByRole('dialog');
      await user.click(
        within(dialog).getByRole('button', { name: /cancelar/i }),
      );

      expect(
        screen.queryByText(/firma electrónica avanzada \(e\.firma\)/i),
      ).not.toBeInTheDocument();
      expect(signMutate).not.toHaveBeenCalled();
    });
  });
});

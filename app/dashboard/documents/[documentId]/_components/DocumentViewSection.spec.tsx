import userEvent from '@testing-library/user-event';
import toast from 'react-hot-toast';
import { renderWithProviders, screen, waitFor, within } from '@/test-utils';
import DocumentViewSection from './DocumentViewSection';
import { SigningCredentialStatus } from '@/lib/enums/identity';
import { useDocumentDetail } from '../_hooks/useDocumentDetail';
import { useDocumentFileUrl } from '../../_hooks/useDocumentFileUrl';
import { useSignDocument } from '../_hooks/useSignDocument';
import { useRejectDocument } from '../_hooks/useRejectDocument';
import { useRequestCancellation } from '../_hooks/useRequestCancellation';
import { useConfirmCancellation } from '../_hooks/useConfirmCancellation';
import { useRequestVerificationCode } from '../_hooks/useRequestVerificationCode';
import { useVerifyCode } from '../_hooks/useVerifyCode';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { copyTextToClipboard } from '@/lib/clipboard';
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
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));
// El copiado real (Clipboard API y su respaldo con execCommand) se prueba en lib/clipboard.spec.ts;
// aquí solo interesa cómo reacciona la sección según haya copiado o no.
jest.mock('@/lib/clipboard');

const mockedCopyTextToClipboard = copyTextToClipboard as jest.Mock;
const mockedUseDocumentDetail = useDocumentDetail as jest.Mock;
const mockedUseDocumentFileUrl = useDocumentFileUrl as jest.Mock;
const mockedUseSignDocument = useSignDocument as jest.Mock;
const mockedUseRejectDocument = useRejectDocument as jest.Mock;
const mockedUseRequestCancellation = useRequestCancellation as jest.Mock;
const mockedUseConfirmCancellation = useConfirmCancellation as jest.Mock;
const mockedUseRequestVerificationCode =
  useRequestVerificationCode as jest.Mock;
const mockedUseVerifyCode = useVerifyCode as jest.Mock;
const mockedToast = toast as unknown as jest.Mock & {
  error: jest.Mock;
  success: jest.Mock;
};

function baseDocument(overrides: Partial<DocumentDetail> = {}): DocumentDetail {
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
    signingCredentialStatus:
      SigningCredentialStatus.IdentityVerificationRequired,
    personalConfigured: false,
    ...overrides,
  };
}

const DEFAULT_COORDS = {
  latitude: 19.4326,
  longitude: -99.1332,
  accuracy: 15,
};

function mockGeolocationSuccess(coords = DEFAULT_COORDS) {
  Object.defineProperty(global.navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: jest.fn((success: PositionCallback) =>
        success({ coords } as GeolocationPosition),
      ),
    },
  });
}

function mockGeolocationError(code: 1 | 2 | 3) {
  Object.defineProperty(global.navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: jest.fn(
        (_success: PositionCallback, error: PositionErrorCallback) =>
          error({
            code,
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          } as GeolocationPositionError),
      ),
    },
  });
}

function mockGeolocationUnsupported() {
  Object.defineProperty(global.navigator, 'geolocation', {
    configurable: true,
    value: undefined,
  });
}

describe('DocumentViewSection', () => {
  const signMutate = jest.fn();
  const rejectMutate = jest.fn();
  const requestCancellationMutate = jest.fn();
  const confirmCancellationMutate = jest.fn();

  beforeEach(() => {
    signMutate.mockReset();
    rejectMutate.mockReset();
    requestCancellationMutate.mockReset();
    confirmCancellationMutate.mockReset();
    mockedToast.mockClear();
    mockedToast.error.mockClear();
    mockedToast.success.mockClear();
    mockedCopyTextToClipboard.mockReset().mockResolvedValue(true);
    mockGeolocationSuccess();
    useAuthStore.setState({ user: buildUser({ signingCredentialStatus: SigningCredentialStatus.Configured }) });

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
      data: {
        fileId: 'obj-1',
        secureUrl: 'https://minio/file',
        expiresIn: 86400,
      },
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
    renderWithProviders(<DocumentViewSection documentId="doc-1" />);

    await user.click(
      screen.getByRole('button', { name: /continuar a firmar/i }),
    );

    await waitFor(() => expect(signMutate).toHaveBeenCalled());
  });

  it('muestra un aviso explicando por qué se solicita la ubicación antes de firmar', () => {
    mockedUseDocumentDetail.mockReturnValue({
      data: baseDocument({ canSign: true, canReject: true }),
      isLoading: false,
      isError: false,
    });
    renderWithProviders(<DocumentViewSection documentId="doc-1" />);

    expect(screen.getByText(/solicitaremos tu ubicación/i)).toBeInTheDocument();
  });

  it('al confirmar la firma, solicita la geolocalización y la envía junto con la firma', async () => {
    mockedUseDocumentDetail.mockReturnValue({
      data: baseDocument({ canSign: true, canReject: true }),
      isLoading: false,
      isError: false,
    });
    const user = userEvent.setup();
    renderWithProviders(<DocumentViewSection documentId="doc-1" />);

    await user.click(
      screen.getByRole('button', { name: /continuar a firmar/i }),
    );

    await waitFor(() =>
      expect(signMutate).toHaveBeenCalledWith({ geolocation: DEFAULT_COORDS }),
    );
    expect(mockedToast).not.toHaveBeenCalled();
  });

  /**
   * La ubicación pasó de opcional a OBLIGATORIA: antes, cualquiera de estos fallos dejaba firmar
   * igual y solo avisaba que la firma iba sin ubicación. Ahora corta el proceso — no se llama a
   * la mutación — y explica el motivo de forma persistente para poder reintentar.
   */
  it.each([
    [
      'el usuario rechaza el permiso',
      () => mockGeolocationError(1),
      /no diste permiso de ubicación/i,
    ],
    [
      'la ubicación no está disponible',
      () => mockGeolocationError(2),
      /no se pudo determinar tu ubicación/i,
    ],
    [
      'se agota el tiempo de espera',
      () => mockGeolocationError(3),
      /se agotó el tiempo de espera/i,
    ],
    [
      'el navegador no soporta geolocalización',
      mockGeolocationUnsupported,
      /tu navegador no permite compartir ubicación/i,
    ],
  ])(
    'si %s: NO firma y explica por qué está bloqueado',
    async (_caso, mockGeo, expectedReason) => {
      mockGeo();
      mockedUseDocumentDetail.mockReturnValue({
        data: baseDocument({ canSign: true, canReject: true }),
        isLoading: false,
        isError: false,
      });
      const user = userEvent.setup();
      renderWithProviders(<DocumentViewSection documentId="doc-1" />);

      await user.click(
        screen.getByRole('button', { name: /continuar a firmar/i }),
      );

      await waitFor(() =>
        expect(mockedToast.error).toHaveBeenCalledWith(
          expect.stringMatching(expectedReason),
        ),
      );
      expect(signMutate).not.toHaveBeenCalled();

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(expectedReason);
      expect(
        screen.getByRole('button', { name: /reintentar con ubicación/i }),
      ).toBeInTheDocument();
    },
  );

  it('no reutiliza una posición cacheada: cada intento de firma pide una lectura fresca', async () => {
    mockedUseDocumentDetail.mockReturnValue({
      data: baseDocument({ canSign: true, canReject: true }),
      isLoading: false,
      isError: false,
    });
    const user = userEvent.setup();
    renderWithProviders(<DocumentViewSection documentId="doc-1" />);

    await user.click(
      screen.getByRole('button', { name: /continuar a firmar/i }),
    );
    await waitFor(() => expect(signMutate).toHaveBeenCalledTimes(1));

    expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({ maximumAge: 0 }),
    );
  });

  it('bug corregido: si el documento requiere verificación y aún no se confirma, oculta "Continuar a firmar" y muestra el flujo de código en su lugar', async () => {
    const requestCodeMutate = jest.fn((_vars, opts) =>
      opts?.onSuccess?.({ emailDelivered: true }),
    );
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
    renderWithProviders(<DocumentViewSection documentId="doc-1" />);

    expect(
      screen.queryByRole('button', { name: /continuar a firmar/i }),
    ).not.toBeInTheDocument();

    // Los textos de la tarjeta los define producto (ver historia "Actualizar la tarjeta OTP en
    // Documentos por firmar"): se fijan aquí para que un refactor no los revierta en silencio.
    expect(
      screen.getByText('Autoriza tu firma con código de validación'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Te enviaremos un código para validar tu firma'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /validar mi firma/i }));
    expect(requestCodeMutate).toHaveBeenCalled();

    await user.type(
      screen.getByPlaceholderText(/código de verificación/i),
      '123456',
    );
    await user.click(screen.getByRole('button', { name: /verificar código/i }));

    expect(verifyCodeMutate).toHaveBeenCalledWith('123456', expect.anything());
  });

  it('bug corregido: si el correo del código no se pudo enviar, la pantalla igual avanza al campo del código y avisa que no llegó (antes el 500 dejaba al firmante encerrado)', async () => {
    const requestCodeMutate = jest.fn((_vars, opts) =>
      opts?.onSuccess?.({ emailDelivered: false }),
    );
    mockedUseRequestVerificationCode.mockReturnValue({
      mutate: requestCodeMutate,
      isPending: false,
    });
    mockedUseVerifyCode.mockReturnValue({
      mutate: jest.fn(),
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
    renderWithProviders(<DocumentViewSection documentId="doc-1" />);

    await user.click(screen.getByRole('button', { name: /validar mi firma/i }));

    expect(
      screen.getByPlaceholderText(/código de verificación/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/no pudimos enviarte el correo/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /reenviar código/i }),
    ).toBeInTheDocument();
  });

  it('bug corregido: mientras el perfil no ha hidratado, NO se abre el modal "Firma no configurada" (antes bloqueaba la pantalla a quien sí la tenía lista)', () => {
    useAuthStore.setState({ user: null });
    mockedUseDocumentDetail.mockReturnValue({
      data: baseDocument({
        canSign: true,
        mySignatureType: SignatureType.Simple,
      }),
      isLoading: false,
      isError: false,
    });

    renderWithProviders(<DocumentViewSection documentId="doc-1" />);

    expect(
      screen.queryByRole('dialog', { name: /firma no configurada/i }),
    ).not.toBeInTheDocument();
  });

  it('bug corregido: con la verificación pendiente, el firmante todavía puede rechazar (rechazar es negarse a firmar, no firmar)', async () => {
    mockedUseRequestVerificationCode.mockReturnValue({
      mutate: jest.fn(),
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
    renderWithProviders(<DocumentViewSection documentId="doc-1" />);

    // Firmar sigue bloqueado hasta validar el código...
    expect(
      screen.queryByRole('button', { name: /continuar a firmar/i }),
    ).not.toBeInTheDocument();

    // ...pero rechazar está disponible y abre el formulario de motivo.
    await user.click(
      screen.getByRole('button', { name: /rechazar documento/i }),
    );

    expect(
      screen.getByPlaceholderText(/explica detalladamente por qué rechazas/i),
    ).toBeInTheDocument();
  });

  it('sin permiso para rechazar (canReject:false) no se ofrece la acción', () => {
    mockedUseDocumentDetail.mockReturnValue({
      data: baseDocument({
        canSign: true,
        canReject: false,
        requiresVerification: false,
        verificationConfirmed: false,
      }),
      isLoading: false,
      isError: false,
    });

    renderWithProviders(<DocumentViewSection documentId="doc-1" />);

    expect(
      screen.queryByRole('button', { name: /rechazar documento/i }),
    ).not.toBeInTheDocument();
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
    renderWithProviders(<DocumentViewSection documentId="doc-1" />);

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
    renderWithProviders(<DocumentViewSection documentId="doc-1" />);

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
    useAuthStore.setState({ user: buildUser({
      signingCredentialStatus:
        SigningCredentialStatus.IdentityVerificationRequired,
    }) });
    mockedUseDocumentDetail.mockReturnValue({
      data: baseDocument({
        canSign: true,
        canReject: true,
        mySignatureType: SignatureType.Simple,
      }),
      isLoading: false,
      isError: false,
    });
    renderWithProviders(<DocumentViewSection documentId="doc-1" />);

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

  /**
   * Rechazar no produce ninguna firma, así que no exige la credencial: el backend dejó de
   * pedirla para `PATCH /document/:id/reject`. Cuando sí la exigía, un firmante sin identidad
   * validada no podía firmar —correcto— pero tampoco declinar, y el documento se quedaba
   * esperando para siempre una respuesta que esa persona no podía dar.
   */
  it('sin credencial configurada, rechazar sigue disponible', async () => {
    const user = userEvent.setup();
    useAuthStore.setState({
      user: buildUser({
        signingCredentialStatus:
          SigningCredentialStatus.IdentityVerificationRequired,
      }),
    });
    mockedUseDocumentDetail.mockReturnValue({
      data: baseDocument({
        canSign: true,
        canReject: true,
        mySignatureType: SignatureType.Simple,
      }),
      isLoading: false,
      isError: false,
    });
    renderWithProviders(<DocumentViewSection documentId="doc-1" />);

    // Se cierra el diálogo de "Firma no configurada" para llegar a la pantalla.
    await user.keyboard('{Escape}');

    const reject = screen.getByRole('button', {
      name: /rechazar documento/i,
    });

    expect(reject.closest('[inert]')).toBeNull();

    await user.click(reject);

    expect(
      screen.getByPlaceholderText(/explica detalladamente por qué rechazas/i),
    ).toBeInTheDocument();
  });

  it('bug corregido: sin firma configurada, la leyenda incluye un acceso HABILITADO para configurarla — al cerrar el modal la pantalla quedaba sin ninguna acción posible', async () => {
    const user = userEvent.setup();
    useAuthStore.setState({ user: buildUser({
      signingCredentialStatus:
        SigningCredentialStatus.IdentityVerificationRequired,
    }) });
    mockedUseDocumentDetail.mockReturnValue({
      data: baseDocument({
        canSign: true,
        canReject: true,
        mySignatureType: SignatureType.Simple,
      }),
      isLoading: false,
      isError: false,
    });
    renderWithProviders(<DocumentViewSection documentId="doc-1" />);

    // Se cierra el diálogo, que es justo lo que dejaba al firmante encerrado.
    await user.keyboard('{Escape}');

    const configure = screen.getByRole('button', {
      name: /configurar mi firma/i,
    });
    expect(configure).toHaveAttribute(
      'href',
      '/dashboard/personal-documents/identity',
    );
    // Fuera del bloque inerte: es la única acción con la que el firmante puede avanzar.
    expect(configure.closest('[inert]')).toBeNull();
  });

  it('bug corregido: al acceder por ruta directa sin firma simple configurada, bloquea el documento con un overlay y despliega un modal de alerta', () => {
    useAuthStore.setState({ user: buildUser({
      signingCredentialStatus:
        SigningCredentialStatus.IdentityVerificationRequired,
    }) });
    mockedUseDocumentDetail.mockReturnValue({
      data: baseDocument({
        canSign: true,
        canReject: true,
        mySignatureType: SignatureType.Simple,
      }),
      isLoading: false,
      isError: false,
    });
    renderWithProviders(<DocumentViewSection documentId="doc-1" />);

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
    useAuthStore.setState({ user: buildUser({
      signingCredentialStatus:
        SigningCredentialStatus.IdentityVerificationRequired,
    }) });
    mockedUseDocumentDetail.mockReturnValue({
      data: baseDocument({
        canSign: true,
        canReject: true,
        mySignatureType: SignatureType.Fiel,
      }),
      isLoading: false,
      isError: false,
    });
    renderWithProviders(<DocumentViewSection documentId="doc-1" />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      screen.queryByText(/tu firma no ha sido configurada/i),
    ).not.toBeInTheDocument();
  });

  it('no muestra la leyenda de firma simple cuando el usuario ya la tiene configurada', () => {
    useAuthStore.setState({ user: buildUser({ signingCredentialStatus: SigningCredentialStatus.Configured }) });
    mockedUseDocumentDetail.mockReturnValue({
      data: baseDocument({
        canSign: true,
        canReject: true,
        mySignatureType: SignatureType.Simple,
      }),
      isLoading: false,
      isError: false,
    });
    renderWithProviders(<DocumentViewSection documentId="doc-1" />);

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
    renderWithProviders(<DocumentViewSection documentId="doc-1" />);

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
    renderWithProviders(<DocumentViewSection documentId="doc-1" />);

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
    renderWithProviders(<DocumentViewSection documentId="doc-1" />);

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
    renderWithProviders(<DocumentViewSection documentId="doc-1" />);

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
    renderWithProviders(<DocumentViewSection documentId="doc-1" />);

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
    renderWithProviders(<DocumentViewSection documentId="doc-1" />);

    expect(
      screen.getByText('PDF preview: https://minio/file'),
    ).toBeInTheDocument();
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
      return renderWithProviders(<DocumentViewSection documentId="doc-1" />);
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

    it('sin ubicación no abre siquiera el diálogo de e.firma: el bloqueo ocurre antes de pedir contraseña y archivos', async () => {
      mockGeolocationError(1);
      const user = userEvent.setup();
      renderFielDocument();

      await user.click(
        screen.getByRole('button', { name: /continuar a firmar/i }),
      );

      await waitFor(() => expect(mockedToast.error).toHaveBeenCalled());
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
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

      // La firma FIEL también manda la ubicación (obligatoria): antes el payload era una unión
      // excluyente y la firma avanzada viajaba SIN geolocalización.
      expect(signMutate).toHaveBeenCalledWith(
        {
          geolocation: DEFAULT_COORDS,
          advancedSignature: {
            password: 'MiContraseña123',
            keyFile: expect.any(File),
            cerFile: expect.any(File),
          },
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

  describe('compartir el enlace público', () => {
    const PUBLIC_URL = `${window.location.origin}/public/documents/doc-1`;

    function renderSignedDocument() {
      mockedUseDocumentDetail.mockReturnValue({
        data: baseDocument({ status: DocumentStatus.Signed }),
        isLoading: false,
        isError: false,
      });
      return renderWithProviders(<DocumentViewSection documentId="doc-1" />);
    }

    it('genera la URL de la vista pública del documento y la copia al portapapeles', async () => {
      const user = userEvent.setup();
      renderSignedDocument();

      await user.click(
        screen.getByRole('button', { name: /compartir enlace/i }),
      );

      await waitFor(() =>
        expect(mockedCopyTextToClipboard).toHaveBeenCalledWith(PUBLIC_URL),
      );
    });

    it('la URL apunta al visor público y no a la ruta autenticada del documento', async () => {
      const user = userEvent.setup();
      renderSignedDocument();

      await user.click(
        screen.getByRole('button', { name: /compartir enlace/i }),
      );

      await waitFor(() => expect(mockedCopyTextToClipboard).toHaveBeenCalled());
      const [copiedUrl] = mockedCopyTextToClipboard.mock.calls[0];
      expect(copiedUrl).toContain('/public/documents/doc-1');
      expect(copiedUrl).not.toContain('/dashboard');
    });

    it('avisa al usuario que el enlace se copió correctamente', async () => {
      const user = userEvent.setup();
      renderSignedDocument();

      await user.click(
        screen.getByRole('button', { name: /compartir enlace/i }),
      );

      await waitFor(() =>
        expect(mockedToast.success).toHaveBeenCalledWith('Enlace copiado'),
      );
      expect(
        await screen.findByRole('button', { name: /enlace copiado/i }),
      ).toBeInTheDocument();
    });

    it('si la copia automática falla, ofrece el enlace para copiarlo manualmente', async () => {
      mockedCopyTextToClipboard.mockResolvedValue(false);
      const user = userEvent.setup();
      renderSignedDocument();

      await user.click(
        screen.getByRole('button', { name: /compartir enlace/i }),
      );

      const field = await screen.findByLabelText(
        /enlace público del documento/i,
      );
      expect(field).toHaveValue(PUBLIC_URL);
      expect(mockedToast.error).toHaveBeenCalledWith(
        expect.stringMatching(/cópialo manualmente/i),
      );
    });

    it('tras un fallo, reintentar la copia vuelve a intentarlo y confirma si esta vez sí copió', async () => {
      mockedCopyTextToClipboard.mockResolvedValueOnce(false);
      const user = userEvent.setup();
      renderSignedDocument();

      await user.click(
        screen.getByRole('button', { name: /compartir enlace/i }),
      );
      await screen.findByRole('button', { name: /reintentar copia/i });

      mockedCopyTextToClipboard.mockResolvedValue(true);
      await user.click(
        screen.getByRole('button', { name: /reintentar copia/i }),
      );

      expect(
        await screen.findByRole('button', { name: /enlace copiado/i }),
      ).toBeInTheDocument();
      // El respaldo manual desaparece al lograrse la copia: ya no hay nada que copiar a mano.
      expect(
        screen.queryByLabelText(/enlace público del documento/i),
      ).not.toBeInTheDocument();
    });

    it('la acción está disponible aunque el documento siga pendiente de firma', () => {
      mockedUseDocumentDetail.mockReturnValue({
        data: baseDocument({ status: DocumentStatus.Pending, canSign: true }),
        isLoading: false,
        isError: false,
      });
      renderWithProviders(<DocumentViewSection documentId="doc-1" />);

      expect(
        screen.getByRole('button', { name: /compartir enlace/i }),
      ).toBeInTheDocument();
    });
  });
});
